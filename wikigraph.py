from flask import Flask, render_template, request, jsonify
import query, sqlite3, random, time

app = Flask(__name__)
app.secret_key = 'lisaneedsbraces'

def connect():

    cursor = sqlite3.connect('data/pagenames.db').cursor()    
    return cursor

@app.route('/')
def index():

	return render_template('index.html')

@app.route('/query')
def get_path():

	node2, node1, code2, code1 = request.args.values()
	path_query = node1.replace(' ', '_') + '|' + node2.replace(' ', '_')
	print "%s (%s) -> %s (%s)?" % (node1, code1, node2, code2)
	response = query.create_lists(str(code1), str(code2))
	
	return response

@app.route('/page-names')
def get_page_names():

	t0 = time.time()

	entry = request.args.get("query").lower()
	print "Requesting page names for '%s'..." % entry

	cursor = connect()
	query1 = 'SELECT code, title FROM pagenames WHERE title_lower = ?'
	row = cursor.execute(query1, (entry,)).fetchone()

	results = [{ 'title': row[1], 'code': row[0] }] if row != None else []

	query2 = '''SELECT code, title 
				FROM pagenames 
				WHERE title LIKE ? 
				OR title LIKE ? 
				LIMIT 50;'''

	rows = cursor.execute(query2, (entry + '%', '% ' + entry, ))
	results.extend([{ 'title': row[1], 'code': row[0] } for row in rows])
	response = jsonify(**{ 'results': results })

	t1 = time.time()

	print "DB responded with %d results in %0.2f seconds" % (len(results), t1- t0)

	return response

@app.route('/random-query')
def get_random_names():

	cursor = connect()
	query = '''SELECT code, title
			   FROM pagenames
			   WHERE degrees > 150
			   AND title NOT BETWEEN 'List' and 'Lisu'
			   AND NOT title BETWEEN '0' and '9}'
			   ORDER BY RANDOM()
			   LIMIT 2'''
	rows = cursor.execute(query).fetchall()
	results = [{ 'title': row[1].replace('_', ' '), 'code': row[0] } for row in rows]
	response = jsonify(**{ 'results': results })

	return response

if __name__ == '__main__':
	# app.run(debug=True)
	app.run(host="54", debug=True)