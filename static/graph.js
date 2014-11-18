function drawGraph(json) {

  // establish width and height of the svg
  var width = 500,
      height = 300;

  // color established as a scale
  var color = d3.scale.category10();

  // appends svg tag to graph-result div
  var svg = d3.select(".graph-result").append("svg")
      .attr("width", width)
      .attr("height", height);

  // this function handles the parameters of the force-directed layout
  var force = d3.layout.force()
      .gravity(0.2)
      .distance(70)
      .charge(-100)
      .size([width, height]);

  // this calls the function force on the nodes and links
  force
      .nodes(json.nodes)
      .links(json.links)
      .start();

  // this appends the marker tag to the svg tag, and defines the arrowhead 
  // shape within it
  svg.append("svg:defs").selectAll("marker")
      .data(["arrow"])
    .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 23)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-4L10,0L0,4Z");

  // append attributes for each link in the json
  var link = svg.selectAll(".link")
      .data(json.links)
    .enter().append("line")
      .attr("class", "link")
      .style("stroke", function(d) {
        if (d.value == 1) { return "#333"; }
      })
      .style("opacity", 0.7)
      .attr("marker-end", "url(#arrow)");

  // append attributes for each node in the json
  var node = svg.selectAll(".node")
      .data(json.nodes)
    .enter().append("circle")
      .attr("class", "node")
      .attr("r", function(d) {
        if (d.group == "path") {
          return 10;
        } else { return 8; }
      })
      .style("fill", function(d) {
        if (d.group == "path") {
          return "#333";
        } else { return color(d.type); }
      })
      .call(force.drag); // allows dragging and stops movement upon mouseover

  // this appends a mouseover text field to each node with name and type
  node.append("title")
      .text(function(d) { return d.name + " (" + d.id + "), " + d.type; });

  function tick() {
      node.attr("cx", function(d) { return d.x = Math.max(15, Math.min(width - 15, d.x)); })
        .attr("cy", function(d) { return d.y = Math.max(15, Math.min(height - 15, d.y)); });

      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      }
  

  // for each ticky, the distance between each pair of linked nodes is computed,
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