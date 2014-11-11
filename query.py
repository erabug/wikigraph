from py2neo import neo4j
import json
import sys
import time

def find_shortest_path(node1, node2):
	"""Connect to graph database, send query to graph database. Return shortest
	path between two nodes.
	Format: (67149)-[:"LINKS_TO"]->(421)"""

	graph_db = neo4j.GraphDatabaseService()

	t0 = time.time()
	query = neo4j.CypherQuery(
		graph_db, 
		"""MATCH (m {node:'%s'}), (n {node:'%s'}), 
		p = shortestPath((m)-[*..20]->(n)) RETURN p""" % (node1, node2)
		)

	path = query.execute_one()
	t1 = time.time()

	print "Shortest Path:", path
	print "Time elapsed: %.2f seconds." % (t1 - t0)

	return path

def create_rels_list(path):
	"""Given the returned path, create a dict for each relationship, return list 
	of dicts. 
	Format: [{'source': 42, 'target': 552}]"""

	rels_list = []

	for rel in path.relationships:
		start_node = rel.start_node.get_properties()['node']
		end_node = rel.end_node.get_properties()['node']
		rels_list.append({"source": int(start_node), "target": int(end_node)})

	return rels_list

def create_nodes_list(path):
	"""Given the returned path, create a dict for each node, return list 
	of dicts. 'Type' is included when available. 
	Format: [{'node': 42, 'name': 'Douglas Adams'}]"""

	nodes_list = []

	for a_node in path.nodes:

		node, name = a_node.get_properties().values()
		name = name.replace('_', ' ')
		node = int(node)

		d = {"id": node, "name": name}

		labels = a_node.get_labels()
		label = labels - set(['Page']) # does it have a label other than Page?
		if label:
			d['type'] = list(label)[0]

		nodes_list.append(d)

	# print "\nnode name: %s (%s)" % (name, node)
	# for j in a_node.match(limit=2):
	# 	start_name = j.start_node.get_properties()['name']
	# 	end_name = j.end_node.get_properties()['name']
	# 	print start_name + " also links to", end_name

	return nodes_list

def create_lists(path):
	"""Assemble list of nodes and relationships from the path, then process
	to recode their IDs. Write output to a JSON file."""

	rels_list = create_rels_list(path)
	nodes_list = create_nodes_list(path)

	codes = {}
	id_counter = 0

	for node in nodes_list: # create a dict to translate id codes
		node_id = node['id']
		if node_id not in codes:
			codes[node_id] = id_counter
			id_counter += 1
		node['id'] = codes[node_id]

	for rel in rels_list: # look up the source and target in codes
		rel['source'] = codes[rel['source']]
		rel['target'] = codes[rel['target']]

	response = '{ "directed": true, "nodes":' + json.dumps(nodes_list) + ', "links":' + json.dumps(rels_list) + ', "multigraph": false }'
	
	with open('response.json', 'wb') as w:
		w.write(response)

if __name__ == "__main__":
	f, node1, node2 = sys.argv
	path = find_shortest_path(str(node1), str(node2))
	create_lists(path)

