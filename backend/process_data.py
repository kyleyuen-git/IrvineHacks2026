import pandas as pd

def combine_data():
    df1 = pd.read_json("listings/part1.json")
    df2 = pd.read_json("listings/part2.json")
    full_df = pd.concat([df1, df2])
    full_df = full_df.reset_index(drop=True)
    full_df.to_json("listings/full_listings.json")


