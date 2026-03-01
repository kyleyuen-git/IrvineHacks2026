import pandas as pd

def combine_data():
    df1 = pd.read_json("listings/part1.json")
    df2 = pd.read_json("listings/part2.json")
    full_df = pd.concat([df1, df2])
    full_df = full_df.reset_index(drop=True)
    full_df.to_json("listings/full_listings.json")

def combine_more_data():
    df1 = pd.read_json("rent_listings/part1.json")
    df2 = pd.read_json("rent_listings/part2.json")
    df3 = pd.read_json("rent_listings/part3.json")
    df4 = pd.read_json("rent_listings/part4.json")
    df5 = pd.read_json("rent_listings/part5.json")
    full_df = pd.concat([df1, df2])
    full_df = pd.concat([full_df, df3])
    full_df = pd.concat([full_df, df4])
    full_df = pd.concat([full_df, df5])
    full_df = full_df.reset_index(drop=True)
    full_df.to_json("rent_listings/full_raw_listings.json")
    

def filter_columns():
    df = pd.read_json("rent_listings/full_raw_listings.json")
    df = df.loc[:,["id", "zipCode", "propertyType", "bedrooms", "bathrooms", "squareFootage", "price", "listedDate"]]
    print(df.columns)
    df = df.dropna()
    df["listedDate"] = pd.to_datetime(df["listedDate"])
    df["listedYear"] = df["listedDate"].dt.year
    df["listedMonth"] = df["listedDate"].dt.month
    df["listedDay"] = df["listedDate"].dt.day
    df = df.drop("listedDate", axis=1)
    print(df.index)
    df.to_json("rent_listings/filtered_rent.json")

filter_columns()


