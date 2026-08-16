<!--
 * @Author        : fineemb
 * @Github        : https://github.com/fineemb
 * @Description   : 
 * @Date          : 2020-02-16 22:33:53
 * @LastEditors   : fineemb
 * @LastEditTime  : 2020-10-26 14:34:38
 -->

# Lovelace Gaode Map Card

[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg)](https://github.com/custom-components/hacs)

这个是一个基于高德地图API的Lovelace卡片,完全复刻的官方地图卡片,几乎包含了原来卡片的所有功能. 未来可能会支持更多新的技能.

+ 完全复刻官方的卡片
+ 支持前台自定义卡片配置.

## 更新

+ v1.1
  + 修复未设置路径显示的时候出现空白的错误

  
+ v1.2 **破坏性更新** ( 注意下面的配置示例的变化 )
  + 修复多个key冲突的问题
  + 更改卡片关键字为 `gaode-map-card`
  + 更改配置entities格式和官方map卡片一样

+ v1.2.1
  + 修复`device_tracker`未纳入范围显示的问题

+ v1.2.2
  + 修复覆盖层导致地图不能缩放移动的问题

+ v1.2.3
  + 增加了实时路况的显示开关
  + 修复了icon显示的问题
  
+ v1.2.4
  + 增加了背景根据主题变化( 主题需要定义 card-background-color )
  + 条目编辑改用官方的组件( 虽然官方也有bug )
  + 整理代码修复bug若干
  + 适配面板模式
  + 增加一个方向的参数,配置(angle: sensor.che_liang_fang_xiang)根据方向传感器,地图自动调整方向
+ v1.2.5
  + 增加设备来源数据的坐标体系选择,默认不设置为`gps:GPS原始坐标`. 可选项为`baidu：百度经纬度` `mapbar：图吧经纬度` `gaode: 高德经纬度`
+ v1.2.6
  + 优化代码,修复116带来的一些问题

    ```` yaml
    aspect_ratio: '1'
    dark_mode: auto
    entities:
      - entity: person.ha
        type: mapbar
      - entity: device_tracker.mix
        type: gaode
      - entity: person.fi
        type: baidu
      - entity: device_tracker.cx11_csp_001
        type: gps
    hours_to_show: '18'
    key: f87e0casfdasfe7dfasdf979f0
    securityJsCode: 你的安全密钥
    traffic: false
    type: 'custom:gaode-map-card'

  ````
+ v1.2.7
  + 优化代码,减少载入

+ v1.2.8
  + 配置编辑器使用 HA 原生 getConfigForm 表单,支持全部配置项(标题、宽高比、缩放、历史轨迹、地图模式、实时路况、方向传感器、实体、API KEY、安全密钥)
  + 支持高德安全密钥(securityJsCode),2021年12月后新申请的Key必须配置,否则地图无法加载
  + 修复 `aspect_ratio` 配置为 `16:9` 时地图空白的问题
  + 修复切换视图/编辑模式导致地图重复初始化的问题
  + 增加容错:未配置entities、方向传感器缺失、地图加载失败时不再导致卡片崩溃
  
## 预览
![](1.gif)

## HACS 安装
搜索Gaode Map card, 或者手动添加地址安装
## 手动安装
1. 下载 `cn-map-card.js`
1. 复制到 `www\community\lovelace-cn-map-card`
1. 在Lovelace的resources下添加以下配置
    ``` yaml
    resources:
      - url: /local/community/lovelace-cn-map-card/cn-map-card.js
        type: module
    ```
1. 在Lovelace视图 `views.cards` 内部添加卡片配置
    ```yaml
      type: 'custom:gaode-map-card'
      default_zoom: '9'
      dark_mode: false
      hours_to_show: '168'
      entities:
        - person.a
        - person.b
        - person.c
        - zone.school
        - zone.home
      key: f87e0c9c4f3e1e78f963075d142979f0
      securityJsCode: 你的安全密钥
      title: Map
    ```

> **注意**:高德地图自2021年12月2日起,Web端JS API 强制要求"安全密钥"(securityJsCode)。新申请的Key必须同时配置 `securityJsCode`,否则地图无法加载。请到 [高德开放平台](https://lbs.amap.com) 申请Key并获取安全密钥。

## 选项

| 属性名 | 类型 | 默认 | 描述
| ---- | ---- | ------- | -----------
| title | string | 选项 | 卡片标题
| entities | entity id | **必选** | 需要显示的条目,支持person,zone,device_tracker
| default_zoom | Number | 选项 | 地图默认缩放等级
| dark_mode | boolean | 选项 | 地图夜间黑暗模式开关
| traffic | boolean | 选项 | 实时路况
| hours_to_show | Number | 选项 | 指定时间内的历史路径,这里是填的是小时
| key | string | **必选** | 自己去高德申请key,内置的key说不定哪天就失效了.
| securityJsCode | string | 选项 | 高德安全密钥,2021年12月后申请的新Key必填
| angle | entity id | 选项 | 方向传感器实体,开启追踪(点击左上角按钮)时地图自动旋转
