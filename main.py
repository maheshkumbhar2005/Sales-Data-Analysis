from src.sales_analysis import main
from src.sales_analysis import DATA_PATH, load_sales_data
from src.sql_layer import create_sales_database
from src.alert import check_anomalies_and_alert


if __name__ == "__main__":
    main()
    db_path = create_sales_database(load_sales_data(DATA_PATH))
    check_anomalies_and_alert(db_path)

