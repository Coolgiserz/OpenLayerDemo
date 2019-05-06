/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/**
 *
 * @param opts
 * {
 *   target:"divid",                  //the id of map component div
 *   width:800,
 *   height:600,                      //the pixel height of map
 *   center:[x,y],                    //the coordinate of center point
 *   zoom:10,                         //level of zooming
 *   srid:3857,                       //id of projection
 *   backgroundMap:"GOOGLE_SATELLITE" //type of background map
 * }
 * @constructor
 * @return MapControl
 */
// define('GOOGLE_SATELLITE',0);
MapControl = function (opts) {
    var me = this;
    // set the requests options

    me._options = $.extend({
        width:800,
        height:600,
        center:ol.proj.transform([112.92,28.2],"EPSG:4326","EPSG:"+(opts.srid?opts.srid:3857)),
        zoom:8,
        srid:3857
    },opts);

    // to deal with the bad case
    if(!me._options.target){
        console.log("DIV NEEDED!");
        return;
    }
    //update the stylesheet of mapcontrol
    me.el = $('#'+me._options.target).css({
        width:me._options.width +"px",
        height: me._options.height + "px",
        position: "relative"
    });

    //set uuid for maps
    me.olmapid = uuid();
    me.bgmapid = uuid();
    me.coolmapid = uuid();
    $("<div>").attr("id",me.coolmapid).addClass("coolmap").css({"z-index":3}).appendTo(me.el);
    $("<div>").attr("id",me.olmapid).addClass("olmap").css({"z-index":2}).appendTo(me.el);
    $("<div>").attr("id",me.bgmapid).addClass("bgmap").css({"z-index":1}).appendTo(me.el);



    //create a draft layer object for user-customed painting
    me.draftSource = new ol.source.Vector();
    me.draftLayer = new ol.layer.Vector({
        source: me.draftSource
    });
    //initialize the background map based on user's will
    if(["GOOGLE_SATELLITE", "GOOGLE_ROAD", "GOOGLE_HYBRID", "OPEN_STREET_MAP", "OSM","AMAP_TILE"].indexOf(me._options.backgroundMap)>=0){
        me._initXYZBackgroundMap();
    }else if(me._options.backgroundMap==="AMAP"){
        me._initAMapBackgroundMap();
    }else if(me._options.backgroundMap==="TIANDITU"){
        me._initTiandituBackgroundMap();
    }else if(me._options.backgroundMap==="BAIDUMAP"){
        me._initBaiduBackgroundMap();
    }

    //init Geoserver Map
    me._initCoolMapFromGeo();
    me._initDrawInteractions();
    return me;
    //other code...
};
MapControl.prototype._initCoolMapFromGeo = function () {
    var me = this;
    me._geoImageSource = new ol.source.TileWMS({
        url:"localhost:8080/geoserver/wms",
        params:{
            'LAYERS':'china:ChinaMap_group',

        },
        serverType:'geoserver'
    });
    me._geoLayer = new ol.layer.Tile({
        source:me._geoImageSource
    });
    me._coolmap = new ol.Map({
        layers:[
            me._geoLayer,
            me.draftLayer
        ],
        target:me.coolmapid,
        view:new ol.View({
            center:me._options.center,
            zoom:me._options.zoom
        })
    });
};
MapControl.prototype._initXYZBackgroundMap = function () {
    var me = this;
    var bgxyz_url = "";
    if(me._options.backgroundMap==="GOOGLE_SATELLITE"){
        bgxyz_url = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
    }else if(me._options.backgroundMap==="GOOGLE_ROAD"){
        bgxyz_url = "";
    }else if(me._options.backgroundMap==="GOOGLE_HYBRID"){
    bgxyz_url = "";
    }else if(me._options.backgroundMap==="OPEN_STREET_MAP" || me._options.backgroundMap==="OSM"){
        bgxyz_url = "http://tile.openstreetmap.org/{z}/{x}/{y}.png";
    }else if(me._options.backgroundMap==="BAIDU_MAP"){
        bgxyz_url = "http://tile.openstreetmap.org/{z}/{x}/{y}.png";
    }else if(me._options.backgroundMap==="AMAP_TILE"){//load the BMap tile
        bgxyz_url = "http://wprd0{1-4}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=7&x={x}&y={y}&z={z}";
    }

    //create a Tile object
    me._xyzTile = new ol.layer.Tile({
        source: new ol.source.XYZ({
            url:bgxyz_url
        })
    });

    //create a Map using the tiles and layers created and configure map's view
    me._olMap = new ol.Map({
        layers:[
            me._xyzTile,
            me.draftLayer],
        target:me.olmapid,
        view:new ol.View({
            center:me._options.center,
            zoom:me._options.zoom
        })
    });
};

/**
 *
 * @private
 */
MapControl.prototype._initBaiduBackgroundMap = function () {
    var me = this;
    var tdt_srid = 4326;//WGS84
    if(me._options.srid===3857 || me._options.srid===900913){//3857:Web Mercator
        tdt_srid = 900913;
    }

    // transform the center point to WGS84 projection
    var center = ol.proj.transform(
        me._options.center,
        "EPSG:"+me._options.srid,
        "EPSG:"+ 4326
    );

    me.bgMap = new BMap.Map(me.bgmapid);
    var point = new BMap.Point(center[0], center[1]);  // 创建点坐标

    me.bgMap.centerAndZoom(point, me._options.zoom);

    me._olMap = new ol.Map({
        layers: [
            me.draftLayer
        ],
        target: me.olmapid,
        view: new ol.View({
            center: me._options.center,
            zoom: me._options.zoom
        }),
        //缺省情况下，openlayers 允许鼠标操作时，zoom level为浮点数，
        //通过引入js api的方式将会导致 底图和上面的olmap不同步，
        //需要限制zoomlevel智能为整数
        //下面代码即实现这个功能
        interactions: ol.interaction.defaults({}).extend([
            new ol.interaction.PinchZoom({
                constrainResolution: true
            }),
            new ol.interaction.MouseWheelZoom({
                constrainResolution: true,
                zoomDuration: 0
            })
        ])
    });

    me._olMap.getView().on("change", function () {
        me._updateBMap();
    });
    me._olMap.on("pointerdrag", function () {
        me._updateBMap();
    });
};

MapControl.prototype._updateBMap = function () {
    var me = this;
    var v = me._olMap.getView();
    var center = v.getCenter();
    center = ol.proj.transform(center, "EPSG:" + me._options.srid, "EPSG:4326");
    me.bgMap.centerAndZoom(
        new BMap.Point(center[0], center[1]),
        v.getZoom()
    );
};
MapControl.prototype._initTiandituBackgroundMap = function () {
    var me = this;
    var tdt_srid = 4326;//WGS84
    if(me._options.srid===3857 || me._options.srid===900913){//3857:Web Mercator
        tdt_srid = 900913;
    }

    // transform the center point to WGS84 projection
    var center = ol.proj.transform(
        me._options.center,
        "EPSG:"+me._options.srid,
        "EPSG:"+ 4326
    );
    me.bgMap = new T.Map(me.bgmapid, {
        projection: "EPSG:" + tdt_srid
    });

    me.bgMap.centerAndZoom(new T.LngLat(center[0], center[1]), me._options.zoom);

    me._olMap = new ol.Map({
        layers: [
            me.draftLayer
        ],
        target: me.olmapid,
        view: new ol.View({
            center: me._options.center,
            zoom: me._options.zoom
        }),
        //缺省情况下，openlayers 允许鼠标操作时，zoom level为浮点数，
        //通过引入js api的方式将会导致 底图和上面的olmap不同步，
        //需要限制zoomlevel智能为整数
        //下面代码即实现这个功能
        // interactions: ol.interaction.defaults({}).extend([
        //     new ol.interaction.PinchZoom({
        //         constrainResolution: true
        //     }),
        //     new ol.interaction.MouseWheelZoom({
        //         constrainResolution: true,
        //         zoomDuration: 0
        //     })
        // ])
    });

    me._olMap.getView().on("change", function () {
        me._updateTiandituMap();
    });
    me._olMap.on("pointerdrag", function () {
        me._updateTiandituMap();
    });

};

MapControl.prototype._updateTiandituMap = function () {
    var me = this;
    var v = me._olMap.getView();
    var center = v.getCenter();
    center = ol.proj.transform(center, "EPSG:" + me._options.srid, "EPSG:4326");
    me.bgMap.centerAndZoom(
        new T.LngLat(center[0], center[1]),
        v.getZoom()
    );
};

MapControl.prototype._initAMapBackgroundMap = function () {
    var me = this;

    var center = ol.proj.transform(me._options.center,
        "EPSG:" + me._options.srid,
        "EPSG:" + 4326);
    console.log(center);
    var defaultLayer = new AMap.TileLayer();
    var trafficLayer = new AMap.TileLayer.Traffic();
    me.bgMap = new AMap.Map(me.bgmapid, {
        resizeEnable: true,
        center: center,
        zoom: me._options.zoom,
        layers:[defaultLayer,trafficLayer]
    });
   // me.bgMap.setZoomAndCenter(me._options.zoom,new T.LngLat(center[0], center[1]));

    me._olMap = new ol.Map({
        layers: [
            me.draftLayer
        ],
        target: me.olmapid,
        view: new ol.View({
            center: me._options.center,
            zoom: me._options.zoom
        }),
        //缺省情况下，openlayers 允许鼠标操作时，zoom level为浮点数，
        //通过引入js api的方式将会导致 底图和上面的olmap不同步，
        //需要限制zoomlevel智能为整数
        //下面代码即实现这个功能
        interactions: ol.interaction.defaults({}).extend([
            new ol.interaction.PinchZoom({
                constrainResolution: true
            }),
            new ol.interaction.MouseWheelZoom({
                constrainResolution: true,
                zoomDuration: 0
            })
        ])
    });

    me._olMap.getView().on("change", function () {
        me._updateAMap();
    });
    me._olMap.on("pointerdrag", function () {
        me._updateAMap();
    });};

MapControl.prototype._updateAMap = function () {
    var me = this;
    var v = me._olMap.getView();
    var center = v.getCenter();
    center = ol.proj.transform(center, "EPSG:" + me._options.srid, "EPSG:4326");
    console.log('center:',center);
    me.bgMap.setZoomAndCenter(
        v.getZoom(),
        center
    );
};

/**
 * @summary
 *   绘制交互
 * @private
 */
MapControl.prototype._initDrawInteractions = function () {
    var me = this;
    me.drawInteractions = {
        "POINT": new ol.interaction.Draw({
            source: me.draftSource,
            type: 'Point'
        }),
        "LINESTRING": new ol.interaction.Draw({
            source: me.draftSource,
            type: 'LineString'
        }),
        "POLYGON": new ol.interaction.Draw({
            source: me.draftSource,
            type: 'Polygon'
        })
    };

    for (var key in me.drawInteractions) {
        me._olMap.addInteraction(me.drawInteractions[key]);
    }
    me._deactiveDrawIngteractions();

};

MapControl.prototype._deactiveDrawIngteractions = function () {
    var me = this;
    for(var key in me.drawInteractions){
        me.drawInteractions[key].setActive(false);
    }
    me._olMap.un("singleclick",me._onMapClick);
};

MapControl.prototype._setDrawOperation = function (op) {
    var me = this;
    me._deactiveDrawIngteractions();
    if(["POINT","LINESTRING","POLYGON"].indexOf((op)>=0)){
        console.log(op);
        me.drawInteractions[op].setActive(true);
        // ol.interactions.Cl
    }else{
        me._olMap.on("singleclick",me._onMapClick);
        console.log(op);


    }
};
MapControl.prototype._onMapClick = function (ev) {
    var me = this;
    console.log(ev.coordinate);
};