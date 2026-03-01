import pandas as pd
import re #re = regular expressions module. Regular expressions (regex) are patterns used to match strings.

# Load CSV and separate date columns
df = pd.read_csv("backend/zillow_data/City_zori_uc_sfrcondomfr_sm_month.csv")
# Filter for Irvine, CA
df = df[(df["RegionName"] == "Irvine") & (df["State"] == "CA")]

date_cols = [c for c in df.columns if re.match(r"^\d{4}-\d{2}-\d{2}$", str(c))]
meta_cols = [c for c in df.columns if c not in date_cols]

# print("meta:", meta_cols)
# print("num months:", len(date_cols), "first:", date_cols[0], "last:", date_cols[-1])

# convert wide into long (city, date, zori)
# pandas melt() method is used to transform (unpivot) a DataFrame from a wide format to a long format
# e.g.)
long = df.melt(
    id_vars=["RegionName", "State"],   # keep only what you need
    value_vars=date_cols,
    var_name="date",
    value_name="zori"
)
# is turned into:
# RegionName State        date          zori
# 0                 New York    NY  2015-01-31   2495.153822

long["date"] = pd.to_datetime(long["date"])
# dropna() removes remove missing values ( , ) from a DataFrame or Series. It allows you to drop rows or columns based on criteria like having any or all missing values
long = long.dropna(subset=["zori"]).sort_values(["RegionName", "State", "date"])
print(long) 
# example: (Irvine, CA, 2019-06-30, 2875.0)
# print(long.head(40)) # prints the first 40 rows

# Reason for lag:
# A neural network needs an input and output, but zori scores are just an "output" in order from past to current
# There is no input.
# If you just feed it ZORI and ask it to predict ZORI, it learns nothing useful
# Lag just means: Use previous months as input. (Predict future using past.)
# Example with L = 3:
# lag_3	lag_2	lag_1	target
# 2400	2420	2450	2470
L = 12 # Each training sample uses 12 months to predict the next month.
long = long.sort_values("date").copy()
for k in range(1, L+1):
    long[f"lag_{k}"] = long["zori"].shift(k)
long["target"] = long["zori"] # creates a new column in the dataframe called "target" equal to last zori in the csv
# Remove rows without full history
long = long.dropna()
# .shift(k) just moves the column down by k rows in order to match the previous value with the current row 
# e.g. Suppose the Irvine data looks like this:
# date	zori
# Jan	2400
# Feb	2420
# Mar	2450
# Apr	2470
# Now it becomes:
# date	zori	lag_1	lag_2	target
# Jan	2400	NaN	NaN	2400
# Feb	2420	2400	NaN	2420
# Mar	2450	2420	2400	2450
# Apr	2470	2450	2420	2470
# Now look at the April row:
# lag_2 = 2420
# lag_1 = 2450
# target = 2470
# That row is interpreted as:
# Input:
# [2420, 2450]
# Output:
# 2470

# import torch
# feature_cols = [f"lag_{k}" for k in range(1,L+1)]