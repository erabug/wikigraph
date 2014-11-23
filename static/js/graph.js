function drawGraph(json) {

    // establish width and height of the svg
    var width = 600,
        height = 400;

    // color established as a scale
    var color = d3.scale.category10();

    // appends svg tag to graph-result div
    var svg = d3.select(".graph-result").append("svg")
        .attr("width", width)
        .attr("height", height);

    // this function handles the parameters of the force-directed layout
    var force = d3.layout.force()
        .gravity(0.05)
        .distance(function(d) {
          if (d.value == 1) {
            return 125;
          } else { return 70; }
        })
        .charge(-200)
        .size([width, height]);

    // this calls the function force on the nodes and links
    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

    var defs = svg.append("defs")
        .attr("id", "imgdefs");

    // this appends the marker tag to the svg tag, applies arrowhead attributes
    defs.selectAll("marker")
        .data(["arrow"])
      .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 30)
        .attr("markerWidth", 7)
        .attr("markerHeight", 7)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-4L10,0L0,4Z");

    // append attributes for each link in the json
    var link = svg.selectAll(".link")
        .data(json.links)
      .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#666")
        .attr("marker-end", "url(#arrow)");

    // select subset of g that are nodes
    var node = svg.selectAll("g.node")
          .data(json.nodes)
        .enter().append("svg:g")
          .attr("class", "node")
          .call(force.drag);

    // select subset of nodes that are in the path
    var pathNodes = node.filter(function(d) {
        return d.group == "path";
    });

    var nonPathNodes = node.filter(function(d) {
        return d.group != "path";
    })

    var pathLinks = link.filter(function(d) {
        return d.value == 1;
    });

    Object.keys(queryImages).forEach(function(img) {
        img = queryImages[img];
        defs.append("clipPath")
            .attr("id", 'img'+img['id'].toString())
          .append("circle")
            // .attr("cy", -img['height'])
            // .attr("cx", img['width'])
            .attr("r", 35);
    });

    pathLinks
        .style("stroke-width", "2px");

    nonPathNodes.append("circle")
        .attr("r", 12)
        // .attr("transform", "translate(200)")
        .style("fill", function(d) { return color(d.type); });

    pathNodes.append("image")
        .attr("xlink:href", function(d) { return queryImages[d.name]['url'];})
        .attr("x", function(d) { return -queryImages[d.name]['width']/2;})
        .attr("y", function(d) { return -queryImages[d.name]['height']/2;})
        .attr("height", function(d) { return queryImages[d.name]['height'];})
        .attr("width", function(d) { return queryImages[d.name]['width'];})
        .attr("clip-path", function(d) {
            var x = 'img'+queryImages[d.name]['id'];
            return "url(#"+x+")";
        });

    // this appends a mouseover text field to each node with name and type
    node.append("title")
        .text(function(d) {
            return d.name + " (" + d.id + "), " + d.type;
        });

    function tick() {
        node.attr("cx", function(d) { return d.x = Math.max(15, Math.min(width - 15, d.x)); })
            .attr("cy", function(d) { return d.y = Math.max(15, Math.min(height - 15, d.y)); });

        link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

        node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        }
    
    // for each tick, the distance between each pair of linked nodes is computed,
    // the links move to converge on the desired distance
    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });
    });
}