function drawGraph(json) {
  var width = 800,
      height = 400;

  var color = d3.scale.category20();

  var svg = d3.select("body").append("svg")
      .attr("width", width)
      .attr("height", height);

  var force = d3.layout.force()
      .gravity(0.07) //originally 0.05
      .distance(200) //originally 100 and -100
      .charge(-200)
      .size([width, height]);

  // d3.json('response.json', function(error, json) {
    force
        .nodes(json.nodes)
        .links(json.links)
        .start();

    svg.append("svg:defs").selectAll("marker")
        .data(["arrow"])
      .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 24)
        // .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5Z");

    var link = svg.selectAll(".link")
        .data(json.links)
      .enter().append("line")
        .attr("class", "link")
        .attr("marker-end", "url(#arrow)");

    var node = svg.selectAll(".node")
        .data(json.nodes)
      .enter().append("g")
        .attr("class", "node")
        .call(force.drag);

    node.append("circle")
        .attr("r", 16)
        .style("fill", function(d) { return color(d.type); });
        // .attr("x", -8)
        // .attr("y", -8)
        // .attr("width", 16)
        // .attr("height", 16);

    node.append("text")
        .attr("dx", 23)
        .attr("dy", ".35em")
        // .style("fill", "white")
        .text(function(d) { return d.name; });

    node.append("title")
        .text(function(d) { return d.type; });

    force.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });
  // });
}