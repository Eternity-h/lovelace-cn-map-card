console.info("%c  GAODE MAP CARD  \n%c Version 1.2.8 ",
"color: orange; font-weight: bold; background: black", 
"color: white; font-weight: bold; background: dimgray");

import 'https://webapi.amap.com/loader.js';
import './w3color.js';

const preloadCard = type => window.loadCardHelpers()
.then(({ createCardElement }) => createCardElement({type}));

class GaodeMapCard extends HTMLElement {
  constructor() {
    super();
    this.markers = {};
    this.paths = {};
    this.persons = []; 
    this.fit = 0; 
    this.trace = false;
    this.historyPath = {};
    this.loaded = false;
    this.loadst = false;
    
    this.oldentities = []
    this.old_mode;
    this.theme;
    this.positions = {};
    this._colors = [
      "#0288D1",
      "#00AA00",
      "#984ea3",
      "#00d2d5",
      "#ff7f00",
      "#af8d00",
      "#7f80cd",
      "#b3e900",
      "#c42e60",
      "#a65628",
      "#f781bf",
      "#8dd3c7",
    ];

    this.root = this.attachShadow({ mode: 'open' });
    this._loadStarted = false;
    const style = document.createElement('style');
    style.textContent = this._cssData();
    this.root.appendChild(style);
    const hacard = document.createElement('ha-card');
    this.card = hacard;
    hacard.className = 'gaode-map-card';
    hacard.innerHTML = `
    <div id="root">
      <div id="map">
        <div id="container"></div>
        <ha-icon-button id="fitbutton" icon="hass:image-filter-center-focus" title="Reset focus" role="button" tabindex="0" aria-disabled="false"></ha-icon-button>
      </div>
  </div>
    `;
    this.root.appendChild(hacard);
    let fitButton = this.root.querySelector("#fitbutton")
    fitButton.addEventListener('click', () => {
      if(!this.map)return;
      if(this.trace){
        this.trace=false
        this.root.querySelector("#fitbutton").classList.remove("active")
        this.map.setPitch(0)
      }else{
        this.trace=true
        this.root.querySelector("#fitbutton").classList.add("active")
        this.map.setPitch(80)
      }
    });
  }
  connectedCallback(){
    if(this._loadStarted)return;
    this._loadStarted = true;
    this.config = this.config || {};
    if(!this.config.key){
      console.warn("%c GAODE MAP CARD %c 未配置高德API Key,正在使用内置Key(随时可能失效或被滥用限流)。请到 https://lbs.amap.com 申请自己的Key,并配置 securityJsCode(安全密钥)。", "color: orange; font-weight: bold; background: black", "color:#333;background:#ffc");
    }
    this._loadMap({
      key: this.config.key||"ce3b1a3a7e67fc75810ce1ba1f83c01a",
      version: "2.0",
      plugins: ['AMap.MoveAnimation'],
      securityJsCode: this.config.securityJsCode || ''   // 高德安全密钥,2021年12月起新Key强制要求
    });
  }
  disconnectedCallback(){
    if(this.map){
      try{ this.map.destroy(); }catch(e){}
      this.map = null;
    }
    this.loaded = false;
    this._loadStarted = false;
    this.markers = {};
    this.paths = {};
    this.historyPath = {};
    this.persons = [];
    this.positions = {};
    this.oldentities = [];
    this.fit = 0;
    this.trace = false;
    this.old_mode = undefined;
    let fitButton = this.root.querySelector("#fitbutton");
    if(fitButton)fitButton.classList.remove("active");
  }
  static getStubConfig() {
    return {aspect_ratio: '1',
            dark_mode: "auto",
            traffic: false,
            key: "",
            securityJsCode: "",
            entities: ["zone.home"] }
  }
  static getConfigForm() {
    return {
      schema: [
        { name: "title", selector: { text: {} } },
        { name: "aspect_ratio", selector: { text: {} } },
        {
          type: "grid",
          name: "",
          schema: [
            { name: "default_zoom", selector: { number: { mode: "box", min: 3, max: 19 } } },
            { name: "hours_to_show", selector: { number: { mode: "box", min: 0 } } },
          ],
        },
        {
          name: "dark_mode",
          selector: {
            select: {
              options: [
                { value: "normal", label: "白天模式" },
                { value: "dark", label: "夜间模式" },
                { value: "auto", label: "跟随主题" },
              ],
            },
          },
        },
        { name: "traffic", selector: { boolean: {} } },
        { name: "angle", selector: { entity: { include_domains: ["sensor"] } } },
        {
          name: "entities",
          selector: {
            entity: {
              multiple: true,
              include_domains: ["person", "device_tracker", "zone"],
            },
          },
        },
        { name: "key", selector: { text: {} } },
        { name: "securityJsCode", selector: { text: {} } },
      ],
      computeLabel: (schema) => {
        switch (schema.name) {
          case "title": return "标题";
          case "aspect_ratio": return "宽高比 (如 1 或 16:9)";
          case "default_zoom": return "默认缩放级别";
          case "hours_to_show": return "历史轨迹时长 (小时)";
          case "dark_mode": return "地图模式";
          case "traffic": return "实时路况";
          case "angle": return "方向传感器 (可选)";
          case "entities": return "实体 (person / device_tracker / zone)";
          case "key": return "API KEY (必填)";
          case "securityJsCode": return "安全密钥 securityJsCode";
        }
        return undefined;
      },
      computeHelper: (schema) => {
        switch (schema.name) {
          case "entities":
            return "默认按GPS原始坐标显示。如需百度/高德/图吧坐标,请在YAML模式为实体添加 type: baidu / gaode / mapbar 字段";
          case "angle":
            return "开启追踪(点击左上角按钮)时地图自动旋转";
          case "key":
            return "请到 https://lbs.amap.com 申请自己的Key,内置Key随时可能失效或被滥用限流";
          case "securityJsCode":
            return "2021年12月后高德强制要求,新申请的Key必须配置,否则地图无法加载";
        }
        return undefined;
      },
    };
  }
  set isPanel(isPanel){ 	
    this._isPanel = isPanel;
  }
  
  set editMode(editMode){ 	
    this._editMode  = editMode ;
  }

  set hass(hass) {
    this._hass = hass;
    if(!this.config)return;
    this.entities = this.config.entities || [];
    this.card.header=this.config.title;
    if(!this.loaded || this.entities.length<1)return;
    if(this._isPanel){
      this.root.querySelector("#root").style.paddingBottom = 0;
      this.setAttribute("is-panel","");
    }
    var oc = JSON.stringify(this.oldentities);
    var nc = JSON.stringify(this.entities);
    if(oc!=nc){
      //更新标记点
      this.map.clearMap();
      this.markers = {};
      this.paths = {};
      this.historyPath = {};
      this.persons = [];
      this.fit = 0;
      this.entities.forEach(function(entity,index) {
        let entityt = typeof entity === "string"?entity:entity.entity;
        let type = entity.type?entity.type:"gps";
        this._addMarker(entityt,index,type);
      },this);
      this.oldentities = deepClone(this.entities);
    }else{
      //仅更新位置
      for(var i in this.entities) {
        let entityt = typeof this.entities[i] === "string"?this.entities[i]:this.entities[i].entity;
        let type = this.entities[i].type?this.entities[i].type:"gps";
        this._updateMarker(entityt,type);
      }
      //实时追踪
      if(this.trace){
        let angle = 0;
        if(this.config.angle && hass.states[this.config.angle]){
          angle = hass.states[this.config.angle].state || 0;
        }
        if(angle)this.map.setRotation(360-angle);
        this.map.setFitView(this.persons, false, [40, 40, 40, 40]);
      }

    }

    //更新式样
    let dark_mode = this.config.dark_mode || "normal";
    let newTheme = hass.themes.default_theme;
    let style = dark_mode;
    
    if(this.old_mode!=dark_mode){
      if(dark_mode!="auto"){
        this.map.setMapStyle("amap://styles/"+style);
        this.root.querySelector("#map").className = style;
        this.old_mode = dark_mode;
      }else{
        let cardColor = (hass.themes.themes[newTheme] || {})["primary-background-color"] || "#FFFFFF";
        let lightness = cardColor?w3color(cardColor).lightness:1;
        let colorDark = lightness<0.5?true:false;
        style = colorDark?'dark':'normal';
        this.map.setMapStyle("amap://styles/"+style);
        this.root.querySelector("#map").className = style;
        this.old_mode = dark_mode;
        this.theme=hass.themes.default_theme;
      }
    }
    if(dark_mode==="auto"){
      if(this.theme!=newTheme){
        let cardColor = (hass.themes.themes[newTheme] || {})["primary-background-color"] || "#FFFFFF";
        let lightness = cardColor?w3color(cardColor).lightness:1;
        let colorDark = lightness<0.5?true:false;
        style = colorDark?'dark':'normal';
        this.map.setMapStyle("amap://styles/"+style);
        this.root.querySelector("#map").className = style;
        this.old_mode = dark_mode;
        this.theme=hass.themes.default_theme;
      }
    }
    //实时路况图层
    if(this.trafficLayer){
      if(this.config.traffic){
        this.trafficLayer.show();
      }else{
        this.trafficLayer.hide();
      }
    }
    //更新视界
    // console.info(this.fit)
    if(this.fit >= this.entities.length){
      this.map.setFitView(this.persons, false, [40, 40, 40, 40]);
      this.fit = 0;
    }
  }
  setConfig(config) {
    preloadCard('map').catch(function(e){ console.warn("GaodeMapCard: 预加载官方地图卡片失败", e); });

    this.config = deepClone(config);
    let d = this.root.querySelector("#root")
    d.style.paddingBottom = 100*this._parseAspectRatio(this.config.aspect_ratio)+"%";
  }
  _parseAspectRatio(value){
    if(!value)return 1;
    if(typeof value === "number")return value>0?value:1;
    let s = String(value).trim();
    if(s.indexOf(":")>-1){
      let parts = s.split(":");
      let w = parseFloat(parts[0]);
      let h = parseFloat(parts[1]);
      if(w>0 && h>0)return w/h;
    }
    let n = parseFloat(s);
    return (isNaN(n)||n<=0)?1:n;
  }
  _loadMap(config){
    if(typeof AMapLoader === "undefined"){
      console.error("GaodeMapCard: 高德地图Loader加载失败,请检查网络或浏览器CSP是否允许加载 https://webapi.amap.com/loader.js");
      this._loadStarted = false;
      return;
    }
    AMapLoader.load(config).then(()=>{
      let mapContainer = this.root.querySelector("#container");
      this.map = new AMap.Map(mapContainer,{
        viewMode: '3D',
        zoom: this.config.default_zoom || 9
      });
      let mode = this.config.dark_mode || "normal";
      let style = (mode==="auto")?"normal":mode;
      this.old_mode = mode;
      this.map.setMapStyle("amap://styles/"+style);
      this.root.querySelector("#map").className = style;
      
      //实时路况图层
      this.trafficLayer = new AMap.TileLayer.Traffic({
        zIndex: 10
      });
      this.trafficLayer.setMap(this.map);
      this.loaded = true;
      if(this._hass && this._hass.states){
        this.hass = this._hass;   // 地图加载完成后立即刷新一次标记,避免等待下一次状态推送
      }
    }).catch(e => {
        console.error("GaodeMapCard: 地图加载失败,请检查Key/安全密钥/网络", e);
        this._loadStarted = false;
    })
  }
  _updateMarker(entity,type){
    let objstates = this._hass.states[entity];
    if(!objstates || !objstates.attributes.longitude){
      return
    } 
    let gps = [objstates.attributes.longitude, objstates.attributes.latitude];
    let hours_to_show =this.config.hours_to_show||0;
    let newLngLat = new AMap.LngLat(gps[0],gps[1])
    let oldLngLat = new AMap.LngLat(gps[0],gps[1])
    if(this.positions[entity]){
      let oldGPS = this.positions[entity]
      oldLngLat = new AMap.LngLat(oldGPS[0],oldGPS[1])
    }
    let distance = newLngLat.distance(oldLngLat)

    // 过滤太小的距离
    // console.log(distance);
    if(distance>5){
      const that  = this;
      that._convertToGaode(gps, type, function (status, result) {
        if (status === 'complete' && result && result.info === 'ok' && that.markers[entity]) {
          that.markers[entity].moveTo(result.locations[0], {
              autoRotation: false
          })
          if(hours_to_show>0 && that.trace){
            that._gethistory(hours_to_show, entity, "")
          }
        }
      });
    }
    this.positions[entity] = gps;
  }
  // ===== 本地补丁 2026-09-26：离线 WGS-84 -> GCJ-02 =====
  // 原实现调用 AMap.convertFrom()，它内部走高德「坐标转换」REST 接口，要求 key
  // 具备「Web服务(REST API)」平台权限；而加载地图的 key 必须是「Web端(JS API)」。
  // 高德一个 key 只能选一个平台，所以纯 JS API key 调 convertFrom 必然失败，
  // 且失败时回调既不画标记也不报错（上游 issue #24）。
  // 这里改用公开的离线偏移算法，并且「同步回调」——顺带修掉 setFitView 的时序 bug
  // （原来标记要等异步回调才进 this.persons，setFitView 永远拿到空数组）。
  // baidu / mapbar 等其它坐标系仍回退到 AMap.convertFrom。
  _convertToGaode(input, type, callback){
    if(type !== 'gps'){
      AMap.convertFrom(input, type, callback);
      return;
    }
    const PI = 3.1415926535897932384626;
    const A = 6378245.0;
    const EE = 0.00669342162296594323;
    const one = (lng, lat) => {
      // 中国大陆范围外不做偏移
      if(!(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55)){
        return [lng, lat];
      }
      const dLat0 = lat - 35.0, dLng0 = lng - 105.0;
      let dLat = -100.0 + 2.0*dLng0 + 3.0*dLat0 + 0.2*dLat0*dLat0
               + 0.1*dLng0*dLat0 + 0.2*Math.sqrt(Math.abs(dLng0));
      dLat += (20.0*Math.sin(6.0*dLng0*PI) + 20.0*Math.sin(2.0*dLng0*PI)) * 2.0/3.0;
      dLat += (20.0*Math.sin(dLat0*PI) + 40.0*Math.sin(dLat0/3.0*PI)) * 2.0/3.0;
      dLat += (160.0*Math.sin(dLat0/12.0*PI) + 320.0*Math.sin(dLat0*PI/30.0)) * 2.0/3.0;
      let dLng = 300.0 + dLng0 + 2.0*dLat0 + 0.1*dLng0*dLng0
               + 0.1*dLng0*dLat0 + 0.1*Math.sqrt(Math.abs(dLng0));
      dLng += (20.0*Math.sin(6.0*dLng0*PI) + 20.0*Math.sin(2.0*dLng0*PI)) * 2.0/3.0;
      dLng += (20.0*Math.sin(dLng0*PI) + 40.0*Math.sin(dLng0/3.0*PI)) * 2.0/3.0;
      dLng += (150.0*Math.sin(dLng0/12.0*PI) + 300.0*Math.sin(dLng0/30.0*PI)) * 2.0/3.0;
      const radLat = lat / 180.0 * PI;
      let magic = Math.sin(radLat);
      magic = 1 - EE * magic * magic;
      const sqrtMagic = Math.sqrt(magic);
      const mgLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
      const mgLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
      return [lng + mgLng, lat + mgLat];
    };
    const readLL = (p) => {
      if(p && typeof p.getLng === 'function') return [p.getLng(), p.getLat()];
      if(Array.isArray(p)) return [p[0], p[1]];
      return [p.lng, p.lat];
    };
    let items;
    if(Array.isArray(input)){
      // [lng, lat] 两个数字视为单个点；否则视为点数组
      items = (input.length === 2 && typeof input[0] === 'number' && typeof input[1] === 'number')
        ? [input] : input;
    }else{
      items = [input];
    }
    const locations = items.map((p) => {
      const ll = readLL(p);
      const c = one(ll[0], ll[1]);
      return new AMap.LngLat(c[0], c[1]);
    });
    callback('complete', { info: 'ok', locations: locations });
  }
  _addMarker(entity,index,type){
    
    let color = this._colors[index%this._colors.length];
    let objstates = this._hass.states[entity];
    this.fit++;
    if(!objstates || !objstates.attributes.longitude){
      return
    } 
    let gps = new AMap.LngLat(objstates.attributes.longitude, objstates.attributes.latitude);
    let that = this;
    if(type=='gaode'){
      that._showMarker(gps,entity,color,type);
    }else{
      this._convertToGaode(gps, type, function (status, result) {
        if (status === 'complete' && result && result.info === 'ok') {
          that._showMarker(result.locations[0],entity,color,type);
        }
      });
    }
  }

  _showMarker(result,entity,color,type){
    
    let domain = entity.split('.')[0];
    let hours_to_show =this.config.hours_to_show||0;
    let objstates = this._hass.states[entity];
    let entityPicture = objstates.attributes.entity_picture || '';
    let entityName =objstates.attributes.friendly_name?objstates.attributes.friendly_name.split(' ').map(function (part) { return part.substr(0, 1); }).join('') : '';
    // 本地补丁 2026-09-26：device_tracker 直接用 ha-icon 画车辆图标。
    // 原实现依赖 ha-entity-marker，但该元素拿不到 hass，且实体又没有
    // icon/entity_picture 时，只会渲染成一个纯色小圆点（卡片 CSS 还把它
    // 限制成 24x24）。卡片自身已有 `.amap-marker ha-icon` 的定位样式。
    let markerContent = (domain==='device_tracker')
      ? `<div style="width:28px;height:28px;border-radius:50%;background:#fff;border:2px solid `+color+`;box-shadow:0 1px 4px rgba(0,0,0,.35);box-sizing:content-box;"><ha-icon icon="`+(this.config.vehicle_icon||'mdi:car')+`" style="color:`+color+`;"></ha-icon></div>`
      : `<ha-entity-marker width="20" height="20" entity-id="`+entity+`" entity-name="`+entityName+`" entity-picture="`+entityPicture+`" entity-color="`+color+`"></ha-entity-marker>`

    //区域（本地补丁：radius 为 0 时不画 —— AMap.Circle 半径 0 加 3px 描边
    // 会在标记上画出一个同色小圆点。device_tracker 的 gps_accuracy 常为 0）
    var circleRadius = objstates.attributes.radius || objstates.attributes.gps_accuracy || 0;
    if(circleRadius > 0){
      var circle = new AMap.Circle({
        center: result,  // 圆心位置
        radius: circleRadius, // 圆半径
        fillColor: domain==='zone'?'rgb(255, 152, 0)':color,   // 圆形填充颜色
        fillOpacity: 0.2,
        zIndex: 101,
        strokeColor: domain==='zone'?'rgb(255, 152, 0)':color, // 描边颜色
        strokeWeight: 3, // 描边宽度
      });
      this.map.add(circle);
    }
    
    //标记点
    let marker = new AMap.Marker({
      map: this.map,
      position: result,
      content: domain==='zone'?`<ha-icon icon="`+objstates.attributes.icon+`"></ha-icon>`:markerContent,
      zIndex: domain==='zone'?102:103,
      anchor: 'center'
    });
    if(domain==='person'||domain==='device_tracker'){
      this.persons.push(marker);
      //历史路径
      if(hours_to_show>0){
        this._gethistory(hours_to_show, entity, color, type)
      }
    }
    this.markers[entity] = marker;
  }
  
  _gethistory(hours, entity, color, type){
    const endTime = new Date();
    const startTime = new Date();
    startTime.setHours(endTime.getHours() - hours);
    
    const that  = this;
    this._hass.callApi("GET", "history/period/"+startTime.toISOString()+"?filter_entity_id="+entity+"&significant_changes_only=0&end_time="+endTime.toISOString())
    .then(function(res) {
      let arr = res[0]

      if (arr.length > 1 && that.historyPath[entity] != arr.length) {
        that.historyPath[entity] = arr.length;
        var lineArr = []
        for(var i in arr) {
          let p = arr[i].attributes;
          if(p.longitude)lineArr.push(new AMap.LngLat(p.longitude,p.latitude));
        }

        if(type=='gaode'){
          var path2 = lineArr;
          if( that.paths[entity]){
            that.paths[entity].setPath(path2);
          }else{
            that.paths[entity] = new AMap.Polyline({
              map: that.map,
              path: path2,  
              zIndex: 200,
              strokeWeight: 3, 
              strokeColor: color, 
              strokeOpacity: 0.5,
              lineJoin: 'round' 
            });

            for(var i=0;i<path2.length;i+=1){
              var center = path2[i];
              new AMap.CircleMarker({
                map: that.map,
                center:center,
                strokeWeight:0,
                radius:4,
                fillColor:color,
                fillOpacity:0.5,
                zIndex:200,
                bubble:true
              });
            }
          }
        }else{
          that._convertToGaode(lineArr, type, function (status, result) {
            if (status === 'complete' && result && result.info === 'ok') {
              var path2 = result.locations;
              if( that.paths[entity]){
                that.paths[entity].setPath(path2);
              }else{
                that.paths[entity] = new AMap.Polyline({
                  map: that.map,
                  path: path2,  
                  zIndex: 200,
                  strokeWeight: 3, 
                  strokeColor: color, 
                  strokeOpacity: 0.5,
                  lineJoin: 'round' 
                });
    
                for(var i=0;i<path2.length;i+=1){
                  var center = path2[i];
                  new AMap.CircleMarker({
                    map: that.map,
                    center:center,
                    strokeWeight:0,
                    radius:4,
                    fillColor:color,
                    fillOpacity:0.5,
                    zIndex:200,
                    bubble:true
                  });
                }
              }
  
            }
          });
        }

      }
    }).catch(function(err){
      console.warn("GaodeMapCard: 获取历史轨迹失败", err);
    })
  }
  _cssData(){
    var css = `
            :host([is-panel]) ha-card {
                left: 0;
                top: 0;
                width: 100%;
                /**
                 * In panel mode we want a full height map. Since parent #view
                 * only sets min-height, we need absolute positioning here
                 */
                height: 100%;
                position: absolute;
              }
      
              ha-card {
                overflow: hidden;
                
              }
              #map {
                z-index: 0;
                border: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: inherit;
              }

              .amap-container {
                z-index: 0;
                border: none;
                position: relative;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
              }
      
              .amap-logo{
                position: absolute;
                bottom: 0;
                left: 10px;
              }
              .amap-marker ha-icon{
                position: absolute;
                bottom: calc(50% - 12px);
                left: calc(50% - 12px);
              }

              ha-icon-button {
                position: absolute;
                top: 7px;
                left: 7px;
              }
              ha-entity-marker {
                height: 24px!important;
                width: 24px!important;
              }
              
              #root {
                position: relative;
              }
              #container > iframe{
                visibility: hidden;
              }
              :host([is-panel]) #root {
                height: 100%;
              }
              .normal #fitbutton {
                color:#000;
              }
              .dark #fitbutton {
                color:#fff;
              }
              #fitbutton.active {
                color:var(--paper-item-icon-active-color);
              }
    `
    return css;
  }
}

function deepClone(value) {
  if (!(!!value && typeof value == 'object')) {
    return value;
  }
  if (Object.prototype.toString.call(value) == '[object Date]') {
    return new Date(value.getTime());
  }
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  var result = {};
  Object.keys(value).forEach(
    function(key) { result[key] = deepClone(value[key]); });
  return result;
}
customElements.define("gaode-map-card", GaodeMapCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "gaode-map-card",
  name: "地图(中国)",
  preview: true, // Optional - defaults to false
  description: "高德地图" // Optional
});