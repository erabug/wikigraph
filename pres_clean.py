PRESIDENTS = set([
				'George_Washington', 'John_Adams', 'Thomas_Jefferson',
				'James_Madison', 'James_Monroe','John_Quincy_Adams',
				'Andrew_Jackson','Martin_Van_Buren', 'William_Henry_Harrison',
				'John_Tyler', 'James_K._Polk', 'Zachary_Taylor',
				'Millard_Fillmore', 'Franklin_Pierce', 'James_Buchanan',
				'Abraham_Lincoln', 'Andrew_Johnson', 'Ulysses_S._Grant',
				'Rutherford_B._Hayes', 'James_A._Garfield', 'Chester_A._Arthur',
				'Grover_Cleveland', 'Benjamin_Harrison', 'William_McKinley',
				'Theodore_Roosevelt', 'William_Howard_Taft', 'Woodrow_Wilson', 
				'Warren_G._Harding', 'Calvin_Coolidge', 'Herbert_Hoover', 
				'Franklin_D._Roosevelt', 'Harry_S._Truman',
				'Dwight_D._Eisenhower', 'John_F._Kennedy', 'Lyndon_B._Johnson',
				'Richard_Nixon', 'Gerald_Ford', 'Jimmy_Carter', 'Ronald_Reagan',
				'George_H._W._Bush', 'Bill_Clinton', 'George_W._Bush',
				'Barack_Obama'
])

# parse page_links, if source or target is a president, write it

one_hops = set()

with open('data/page_links_en.ttl', 'r') as f, open('data/pres_links.ttl', 'wb+') as p:
	for line in f:
		l = line.split()
		start = l[0][29:-1]
		end = l[2][29:-1]
		if start in PRESIDENTS or end in PRESIDENTS:
			if start not in PRESIDENTS:
				one_hops.add(start)
			if end not in PRESIDENTS:
				one_hops.add(end)
		if start in PRESIDENTS or end in PRESIDENTS or start in one_hops or end in one_hops:
			p.write(line)
