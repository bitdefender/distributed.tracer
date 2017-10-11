# colors
C_DEFAULT="\033[m"
C_CYAN="\033[36m"

source venv/bin/activate

echo "Run Spark..."

sh ~/Downloads/spark-2.0.1-bin-hadoop2.7/bin/spark-submit \
           --master spark://yosemite:7077 \
           --num-executors 2 \
           --total-executor-cores 2 \
           --executor-memory 1g \
           analyzer_with_spark.py -folderPath logs > stdout 2> stderr

# deactivate

echo ""
echo "Done."
echo -e "Details about$C_CYAN logs/$C_DEFAULT saved in$C_CYAN output_files$C_DEFAULT"
echo -e "Histograms saved in$C_CYAN utils/histograms$C_DEFAULT"

