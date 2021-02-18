__module__ = module;
__require__ = require;
module = require = undefined;

__require__("source-map-support").install({
  retrieveSourceMap: source => source in __module__.exports.sourcemaps ? __module__.exports.sourcemaps[source] : null
});

__module__.exports.renderFunction = async function __RenderView__(__runtime__, __isPartial__) {
  __runtime__.renderElementOpenTag("ul", [__runtime__.createNormalAttribute("class", "\"", ["list"])]);

  __runtime__.renderText("\n\t");

  for (let [item] of __runtime__.createCollection(this.items)) {
    __runtime__.renderText("\n\t\t");

    __runtime__.renderElementOpenTag("li", []);

    await __runtime__.renderValue(item);

    __runtime__.renderElementCloseTag("li");

    __runtime__.renderText("\n\t");
  }

  __runtime__.renderText("\n");

  __runtime__.renderElementCloseTag("ul");
};

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1N0b3JhZ2UvUHJvamVjdHMvaGV4ZWwtdmlldy90ZXN0L3ZpZXdzL3Rlc3QuaHRtbCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSwwQ0FBSSwwREFBSixFOztBQUFpQixnQzs7QUFDaEIsWUFBYyxJQUFkLGtDQUFzQixVQUF0QjtBQUFrQyxvQ0FBbEM7O0FBQ0MsOENBREQ7O0FBQUEsVUFDSyw2QkFETDs7QUFDQywyQ0FERDs7QUFDcUIsa0NBRHJCO0FBQUE7O0FBRUssOEI7O0FBSE4seUMiLCJzb3VyY2VzQ29udGVudCI6WyI8dWwgY2xhc3M9XCJsaXN0XCI+XG5cdDxqcyBAZm9yZWFjaD1cIml0ZW0gaW4gdGhpcy5pdGVtc1wiPlxuXHRcdDxsaT57JT0gaXRlbSAlfTwvbGk+XG5cdDwvanM+XG48L3VsPiJdfQ==