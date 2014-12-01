import csv, sqlite3

conn = sqlite3.connect("pagenames.db")
curs = conn.cursor()
curs.execute("CREATE TABLE pagenames (code INTEGER PRIMARY KEY, title TEXT, degrees INTEGER);")

with open('data/nodes.tsv', 'rb') as csv_file:
    sql_insert = 'INSERT INTO pagenames VALUES(?, ?, ?)'
    reader = csv.reader(csv_file, delimiter='\t')
    reader.next()
    for row in reader:
        to_db = [int(row[0]), unicode(row[1].replace('_', ' '), 'utf8'), int(row[3])]
        curs.execute(sql_insert, to_db)

conn.commit()

curs.execute("CREATE UNIQUE INDEX codes ON pagenames(code);")
curs.execute("CREATE INDEX titles ON pagenames(title);")
curs.execute("CREATE INDEX degrees ON pagenames(degrees);")

conn.close()