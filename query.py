from py2neo import neo4j
# from subprocess import call

graph_db = neo4j.GraphDatabaseService()

query = neo4j.CypherQuery(
	graph_db, 
	"""MATCH (m {node:'98'}), (n {node:'2800'}), 
	p = shortestPath((m)-[*..20]->(n)) RETURN p"""
	)

print "\nShortest Path:"
print query.execute_one()
# print type(query) # this is a CypherQuery
x = query.execute().data
# print type(x[0]) # this is a record
# print x[0].values # this is a path
# print x[0].values[0].nodes # all nodes in the path

nodes = x[0].values[0].nodes
for i in nodes:
	name = i.get_properties()['name']
	node = i.get_properties()['node']
	print "\nnode name: %s (%s)" % (name, node)
	for j in i.match(limit=2):
		start_name = j.start_node.get_properties()['name']
		end_name = j.end_node.get_properties()['name']
		print start_name + " also links to", end_name

#write nodes and rels to send via JSON
