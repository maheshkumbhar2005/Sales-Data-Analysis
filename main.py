from src.sales_analysis import main
from src.sales_analysis import DATA_PATH, load_sales_data
from src.sql_layer import create_sales_database


if __name__ == "__main__":
    main()
    create_sales_database(load_sales_data(DATA_PATH))
