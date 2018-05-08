# cocos-creator
### 学习了一段时间的cocos-creator，总结了一些经验 
---

#### 场景处理
  + [预制场景](#scene)
  + [场景属性](#attr)
  + [场景变换](#conversion)
  + [兼容场景](#compatibility)
#### 资源加载
  + [内部资源加载](#inside)
  + [外部资源加载](#outside)
  + [当前资源引用](#atPresent)
  + [require 请求资源](#require)
#### 主要组件的使用
  + [sprite 层精灵组建](#sprite)
  + [animation 动画组件](#animation)
  + [label 文字渲染组建](#label)
  + [mask 遮罩组建](#mask)
  + [button 按钮组建](#button)
  + [widget 位置布局组建](#addr)
####  js代码编写注意事项
  + [properties 外部属性声明](#outattr)
  + [es6](#es6)
  + [update 每帧调用方法](#frame)
  
----
### 场景处理
  <span  id="scene">1.预制场景</span><br> 
    &emsp;&emsp;在cocos creator编辑器的层级管理器中，拖动一个节点到资源管理器中就可以生成一个预支节点，实际使用中我们可以认为预制场景就是一个组件/模块；你可以把任何一个节点变成一个预制场景以便在 [当前资源引用](#atPresent) 中使用他;  如下图：<br/><br/>
    ![image](./image/scene.gif)

  <span  id="attr">2.场景属性</span><br>
    &emsp;&emsp;场景数据分为两大属性：node节点属性和组件属性<br>
    node节点属性主要是控制场景的样式，包括位置、高宽、颜色、透明度、放大缩小倍数等等<br>
    组件属性主要是自带组建特殊设置，如果是用户组建，属性就是用户组件的properties引入项
    ![image](./image/attr.png)

   <span  id="attr">2.场景变换</span><br>