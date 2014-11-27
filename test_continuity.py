print "Testing for continuity..."
with open('data/nodes.tsv', 'rb') as f:
	f.next()
	f.next()
	last_start = 0
	for line in f:
		l = line.split('\t')
		start = int(l[0])
		if (last_start + 1) != start:
			print "ALERT! %d did not match last_start (%d) + 1" % (start, last_start)
		
		last_start = start
print "Done."