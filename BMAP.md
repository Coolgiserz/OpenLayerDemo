### Basic Class
#### Point
http://lbsyun.baidu.com/cms/jsapi/reference/jsapi_reference.html

### Hello, BMap
https://lbsyun.baidu.com/index.php?title=jspopular/guide/helloworld
```js
//create a map
var map = new BMap.Map("container");          // 创建地图实例
var point = new BMap.Point(116.404, 39.915);  // 创建点坐标
map.centerAndZoom(point, 15);
//
