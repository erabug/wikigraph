function drawGraph(json) {

    console.log("raw data:", json);

    // establish width and height of the svg
    var width = 400,
        height = 500;

    // color established as a scale
    var color = d3.scale.category10();

    // appends svg tag to graph div
    var svg = d3.select(".graph").append("svg")
        .attr("width", width)
        .attr("height", height);

    // this function handles the parameters of the force-directed layout
    var force = d3.layout.force()
        .gravity(0.05)
        .distance(function(d) {
          if (d.value == 1) {
            return 100;
          } else { return 70; }
        })
        .charge(-200)
        .size([width, height]);

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
        .style("fill", "#666")
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
    var pathNode = node.filter(function(d) {
        return d.group == "path";
    });

    var nonPathNode = node.filter(function(d) {
        return d.group != "path";
    });

    var pathLinks = link.filter(function(d) {
        return d.value == 1;
    });

    var start;
    Object.keys(queryImages).forEach(function(key) {
        img = queryImages[key];
        if (img.id === 0) { start = key; }
        defs.append("clipPath")
            .attr("id", 'img'+img.id.toString())
          .append("circle")
            // .attr("cy", -img['height']*0.1)
            // .attr("cx", img['width'])
            .attr("r", 30);
    });

    var startNode = pathNode.filter(function(d) {
        return d.name == start;
    });





    pathLinks
        .style("stroke-width", "2px");

    nonPathNode.append("circle")
        .attr("r", 10)
        .style("fill", function(d) { return color(d.type); });

    pathNode.append("image")
        .attr("xlink:href", function(d) { return queryImages[d.name].url;})
        .attr("x", function(d) { return -queryImages[d.name].width/2;})
        // this seems to help for portraits, where height > width
        .attr("y", function(d) {
          var h = queryImages[d.name].height;
          var x;
          if (h > queryImages[d.name].width) { x = 12; } else { x = 0; }
          return -(h/2)+x;
        })
        .attr("height", function(d) { return queryImages[d.name].height;})
        .attr("width", function(d) { return queryImages[d.name].width;})
        .attr("clip-path", function(d) {
            var x = 'img'+queryImages[d.name].id;
            return "url(#"+x+")"; // unique clip path for this node
        });

    pathNode.append("circle") // outline for the path nodes
        .attr("r", 30)
        .style("fill", "none")
        .style("stroke", "#333")
        .style("stroke-width", "2px");

    // this appends a mouseover text field to each node with name and type
    node.append("title")
        .text(function(d) {
            return d.name + " (" + d.id + "), " + d.type;
        });

    // this calls the function force on the nodes and links
    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

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
      startNode.each(function(d) {
        d.fixed = true;
        d.x = width/2;
        d.y = height/6;
      });

      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) {
        return "translate(" + d.x + "," + d.y + ")";
      });

    });
}