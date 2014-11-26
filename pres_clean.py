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

### This creates the presidents subgraph
# parse page_links, if source or target is a president, write it
with open('data/cleaned_links.tsv', 'r') as f, open('data/pres_links.tsv', 'wb+') as p:
	for line in f:
		l = line.split('\t')
		start = l[0]
		end = l[1].rstrip()
		if start in PRESIDENTS or end in PRESIDENTS:
			p.write(line)