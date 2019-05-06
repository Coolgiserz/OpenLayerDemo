## ol/Map
### ol.Map
For a map to render, we need to specify the view, layers, and a target container. The following code is used to create a map object
```js
var map = new Map({
  view: new View({
    center: [0, 0],
    zoom: 1
  }),
  layers: [
    new TileLayer({
      source: new OSM()
    })
  ],
  target: 'map'
});

```
## ol/proj
### Projection Transform
#### ol.proj.transform
we can transform a coordinate from source projection to destination projection
```js
// transform original center from its projection to WGS84(4326)
    var center = ol.proj.transform(me.options.center,
            "EPSG:" + me.options.srid,
            "EPSG:" + 4326);
```

## ol/Interaction

## ol/Tile
### Tile Usage
Tile Usage policies: https://operations.osmfoundation.org/policies/tiles/