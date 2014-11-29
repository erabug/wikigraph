from flask import Flask, render_template, request, jsonify
import query, sqlite3, couchdb, random

app = Flask(__name__)
app.secret_key = 'lisaneedsbraces'

def connect():

    cursor = sqlite3.connect('data/pagenames.db').cursor()    
    return cursor

def check_cached(query):

	# db = couchdb.Server() # assumes CouchDB is running on localhost:5894

	# if query in db:
	# 	response = db[query]
	# else:
	# 	response = None

	return None

def cache_query(query, response):

	db = couchdb.Server()
	db[query] = response

@app.route('/')
def index():

	return render_template('index.html')

@app.route('/query')
def get_path():

	print "requesting shortest path for %s" % request.args.values()
	node2, node1, code2, code1 = request.args.values()
	path_query = node1.replace(' ', '_')+'|'+node2.replace(' ', '_')
	print "%s (%s) -> %s (%s)" % (node1, code1, node2, code2)
	is_cached = check_cached(path_query) # check if cached or not

	if is_cached:
		print "we've seen this query before!"
		response = is_cached
	else:
		response = query.create_lists(str(code1), str(code2))
		# cache_query(query, response)# cache response and query
		# print "query and response cached!"

	return response # string

@app.route('/page-names')
def get_page_names():

	entry = request.args.get("query")
	print "requesting page names for %s..." % entry
	cursor = connect()
	query1 = 'SELECT code, title FROM pagenames WHERE title = ? COLLATE NOCASE'
	row = cursor.execute(query1, (entry,)).fetchone()

	if row == None:
		results = []
	else:
		results = [{ 'title': row[1], 'code': row[0]}]

	query2 = '''SELECT code, title 
				FROM pagenames
				WHERE title LIKE ? 
				OR title LIKE ?
				LIMIT 100;'''

	rows = cursor.execute(query2, (entry + '%', '% ' + entry, )).fetchall()
	results.extend([{ 'title': row[1], 'code': row[0] } for row in rows])
	response = jsonify(**{ 'results': results })
	print response, len(results)

	return response

@app.route('/random-query')
def get_random_names():

	print "starting random query..."
	node1 = str(random.randrange(4578730))
	node2 = str(random.randrange(4578730))

	cursor = connect()
	query = 'SELECT code, title FROM pagenames WHERE code = ? OR code = ?'
	rows = cursor.execute(query, (node1, node2, )).fetchall()
	results = [{ 'title': row[1].replace('_', ' '), 'code': row[0] } for row in rows]
	print 'results:', results
	response = jsonify(**{ 'results': results })

	return response

if __name__ == '__main__':
	app.run(debug=True)
	# app.run(host="54", debug=True)