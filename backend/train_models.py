import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib

def combine_data():
    df1 = pd.read_json("listings/part1.json")
    df2 = pd.read_json("listings/part2.json")
    full_df = pd.concat([df1, df2])
    full_df = full_df.reset_index(drop=True)
    full_df.to_json("listings/full_listings.json")

def combine_more_data(output):
    df1 = pd.read_json("listings/inactive1.json")
    df2 = pd.read_json("listings/inactive1.json")
    df3 = pd.read_json("listings/inactive2.json")
    full_df = pd.concat([df1, df2])
    full_df = pd.concat([full_df, df3])
    full_df = full_df.reset_index(drop=True)
    full_df.to_json(output)

def generic_combine_jsons(files, output_path):
    df = None
    for file in files:
        if df is None:
            df = pd.read_json(file)
        else:
            df = pd.concat(df, pd.read_json(file))
    df.to_json(output_path)

def filter_columns(input_path, output_path):
    df = pd.read_json(input_path)
    df = df.loc[:,["id", "zipCode", "propertyType", "bedrooms", "bathrooms", "squareFootage", "price", "listedDate"]]
    print(df.columns)
    df = df.dropna()
    df["listedDate"] = pd.to_datetime(df["listedDate"])
    df["listedYear"] = df["listedDate"].dt.year
    df["listedMonth"] = df["listedDate"].dt.month
    df["listedDay"] = df["listedDate"].dt.day
    df = df.drop("listedDate", axis=1)
    print(df.index)
    df.to_json(output_path)

def train_model(data_path, output_path):
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
    X_temp, X_test, y_temp, y_test = train_test_split(X, y, test_size =0.2)
    X_train, X_val, y_train, y_val = train_test_split(X_temp, y_temp, test_size =0.2)

    model = MLPRegressor(learning_rate_init=0.05, batch_size= 20, max_iter=200, hidden_layer_sizes = (16, 16, 16))
    model.fit(X_train, y_train)
    print(model.score(X_val, y_val))
    joblib.dump(model, output_path)

#RENT model
#filter_columns("rent_listings/full_raw_listings.json", "rent_listings/filtered_rent.json")
#train_model("rent_listings/filtered_rent.json", "rent_model.joblib")

#VALUE model
paths = ["listings/inactive1.json", "listings/inactive2.json", "listings/inactive3.json"]
combine_more_data("sale_listings_big.json")
filter_columns("sale_listings_big.json", "filtered_sales.json")
train_model("filtered_sales.json", "value_model.joblib")



