import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib

def train_model(data_path):
    df = pd.read_json(data_path)
    y = df.loc[:, "price"]
    X = df.loc[:, ["zipCode", "propertyType", "bedrooms", "bathrooms", "squareFootage", "listedYear", "listedMonth", "listedDay"]]

    label_encoder1 = LabelEncoder()
    label_encoder1.fit(X.loc[:,"propertyType"])
    X.loc[:,"propertyTypeNum"] = label_encoder1.transform(X.loc[:,"propertyType"])
    X = X.drop("propertyType", axis=1)

    label_encoder2 = LabelEncoder()
    label_encoder2.fit(X.loc[:,"zipCode"])
    X.loc[:,"zipCode"] = label_encoder2.transform(X.loc[:,"zipCode"])

    print(X)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size =0.2)

    model = MLPRegressor()
    model.fit(X_train, y_train)
    print(model.score(X_test, y_test))
    joblib.dump(model, "rent_model.joblib")

train_model("rent_listings/filtered_rent.json")



