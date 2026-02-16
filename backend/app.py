from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os

app = Flask(__name__)
# CORS is essential for your frontend to talk to this backend
CORS(app) 

# --- 1. Load Data and AI Models ---

# Load Food AI Assets
try:
    df = pd.read_csv("food_allergens.csv")
    food_model = joblib.load("food_model.pkl")
    food_vectorizer = joblib.load("vectorizer.pkl")
    print("Food AI Model loaded successfully.")
except Exception as e:
    print(f"Error loading Food AI files: {e}")

# Load Skincare AI Assets
try:
    skincare_models = joblib.load("skincare_models.pkl")
    skincare_vectorizer = joblib.load("skincare_vectorizer.pkl")
    skincare_df = pd.read_csv("cosmetics_final_analysis_with_counts.csv")
    print("Skincare AI Models loaded successfully.")
except Exception as e:
    print(f"Error loading Skincare AI files: {e}")

# Load Medicine Dataset
try:
    med_df = pd.read_csv("FINAL_updated_medicine_dataset.csv", usecols=['name', 'Allergens', 'Risk Level', 'Medical Advice'])
    med_df['name_lower'] = med_df['name'].str.lower()
    print("Medicine Dataset loaded successfully.")
except Exception as e:
    print(f"Error loading Medicine dataset: {e}")

risk_reverse_map = {2: "High", 1: "Medium", 0: "Low"}

# --- 2. User Database Setup ---
USER_DB = "users.csv"
if not os.path.exists(USER_DB):
    user_df = pd.DataFrame(columns=["name", "email", "password"])
    user_df.to_csv(USER_DB, index=False)

# --- 3. Authentication Routes ---

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = str(data.get('password')) # Force to string
        
        users = pd.read_csv(USER_DB)
        if email in users['email'].values:
            return jsonify({"error": "User already exists"}), 400
            
        new_user = pd.DataFrame([[name, email, password]], columns=["name", "email", "password"])
        new_user.to_csv(USER_DB, mode='a', header=False, index=False)
        return jsonify({"message": "Registration successful"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email').strip().lower() # Clean the email input
        password = str(data.get('password')) # Force input password to string
        
        if not os.path.exists(USER_DB):
            return jsonify({"error": "No users registered yet"}), 404
            
        users = pd.read_csv(USER_DB)
        
        # FIX: Ensure everything in the CSV is treated as a string and cleaned
        users['email'] = users['email'].astype(str).str.strip().str.lower()
        users['password'] = users['password'].astype(str).str.strip()
        
        # Search for the user
        user_match = users[(users['email'] == email) & (users['password'] == password)]
        
        if not user_match.empty:
            user_data = user_match.iloc[0]
            return jsonify({
                "message": "Login successful",
                "user_id": email,
                "name": str(user_data['name'])
            }), 200
        else:
            return jsonify({"error": "Invalid email or password"}), 401
            
    except Exception as e:
        print(f"Login Error: {e}")
        return jsonify({"error": "Internal Server Error"}), 500

# --- 4. Food Analysis Routes ---

@app.route('/get_products', methods=['GET'])
def get_products():
    try:
        if 'Food Product' in df.columns:
            products = df['Food Product'].dropna().unique().tolist()
            return jsonify(products)
        return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict_food', methods=['POST'])
def predict_food():
    data = request.json
    product_input = data.get('ingredients', '').strip().lower()
    
    try:
        X_input = food_vectorizer.transform([product_input])
        predicted_risk_num = food_model.predict(X_input)[0]
        ai_predicted_risk = risk_reverse_map.get(predicted_risk_num, "Low")
        
        match = df[df['Food Product'].str.lower() == product_input]
        if not match.empty:
            row = match.iloc[0]
            return jsonify({
                "status": f"Found in Database: {row['Food Product']}",
                "risk_level": row["Risk Level"],  
                "allergens": str(row["Detected Allergens"]),
                "solutions": row["Solutions"],
                "medical_advice": row["Medical Advice"]
            })
        else:
            return jsonify({
                "status": f"AI Prediction for '{product_input}'",
                "risk_level": ai_predicted_risk,
                "allergens": "Unknown (Check labels)",
                "solutions": "Verify ingredients manually.",
                "medical_advice": "Consult a doctor if you have known severe sensitivities."
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 5. Skincare Analysis ---

@app.route('/get_skincare_meta', methods=['GET'])
def get_skincare_meta():
    try:
        labels = skincare_df['Label'].unique().tolist()
        brands = skincare_df['Brand'].unique().tolist()
        return jsonify({"labels": labels, "brands": brands})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/predict_skincare_v2', methods=['POST'])
def predict_skincare_v2():
    data = request.json
    label = data.get('label', '').strip()
    brand = data.get('brand', '').strip()
    input_text = f"{label} {brand}"
    try:
        X_input = skincare_vectorizer.transform([input_text])
        results = {key: model.predict(X_input)[0] for key, model in skincare_models.items()}
        return jsonify({
            "status": f"AI Profile for {brand}",
            "allergens": str(results['Allergens_Found']),
            "risk_level": results['Risk_Level'],
            "most_allergic": results['Most_Allergic_Ingredient'],
            "medical_advice": results['Medical_Advice'],
            "severity": str(results['Severity_Scale_1_to_5'])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- 6. Medicine Analysis ---

@app.route('/predict_medicine_v2', methods=['POST'])
def predict_medicine_v2():
    data = request.json
    med_input = data.get('medicine', '').strip().lower()
    try:
        match = med_df[med_df['name_lower'] == med_input]
        if match.empty:
            match = med_df[med_df['name_lower'].str.contains(med_input, na=False)].head(1)

        if not match.empty:
            row = match.iloc[0]
            return jsonify({
                "status": f"Medical Profile: {row['name'].title()}",
                "risk_level": row["Risk Level"],
                "allergens": str(row['Allergens']),
                "medical_advice": row["Medical Advice"]
            })
        else:
            return jsonify({
                "status": "Medicine Not Found",
                "risk_level": "Unknown",
                "allergens": "N/A",
                "medical_advice": "Consult a pharmacist."
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)