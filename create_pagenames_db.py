import csv, sqlite3

conn = sqlite3.connect("pagenames.db")
curs = conn.cursor()
curs.execute("CREATE TABLE pagenames (code INTEGER PRIMARY KEY, title TEXT);")

with open('data/nodes.tsv', 'rb') as csv_file:
    sql_insert = 'INSERT INTO pagenames VALUES(?, ?)'
    reader = csv.reader(csv_file, delimiter='\t')
    reader.next()
    for row in reader:
        curs.execute(sql_insert, [int(row[0]), unicode(row[1], 'utf8')])

conn.commit()