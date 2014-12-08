//初期設定
Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});
Session.set('taskquery', 'open');
Session.set('selectedproject', null);
Session.set('selectedtask', null);
//その週の月曜から開始するように調整
var viewmonth = new Date();
var day = viewmonth.getDay()-1;
if(day<0)day+=7;
viewmonth.setTime(viewmonth.getTime() - day*ONEDAYMILI);
viewmonth.setHours(9);
viewmonth.setMinutes(0);
viewmonth.setSeconds(0);
Session.set('viewmonth', viewmonth);
Session.set('dayspan', 60); //タイムライン1日＝40pxが初期値
Session.set('timeoffset', -7);

//バーチャルズは架空のユーザー。プロジェクト管理に参加しないユーザーやクライアントを表す
Projects = new Mongo.Collection("projects");
Tasks = new Mongo.Collection("tasks");
Virtuals = new Mongo.Collection('virtuals');
Meteor.subscribe("projects");
Meteor.subscribe("tasks");
Meteor.subscribe("virtuals");



//body内のヘルパー
Template.body.helpers({
  //現在のクエリーを表示（テスト用）
  taskquery: function () {
    return Session.get('taskquery');
  }
});


//body内のイベント処理
Template.body.events({
    //メインタブ切り替え
    "click #maintab a": function (event) {
      event.preventDefault();
      var targetlink = $(event.target);
      var targetid = targetlink.attr('href');
      var taskquery = targetlink.data('query');
      if(taskquery != undefined){
        Session.set('taskquery', taskquery);
      }
      //アクティブの付け替え
      $('#maintab .active').removeClass('active');
      $('.tab-content .active').removeClass('active');
      targetlink.parent('li').addClass('active');
      $('.tab-content ' + targetid).addClass('active');
    }
});

//プロジェクトビューのヘルパー
Template.projectview.helpers({
  //ユーザービューかどうかを返す。ユーザービューの場合はユーザーセレクタを表示
  userview: function () {
    if(Session.get('taskquery')=='userview') return true;
    return false;
  },
  //ユーザー一覧
  realusers: function(){
    return Meteor.users.find({});
  },
  virtualusers: function(){
    return Virtuals.find({});
  },
  //プロジェクト一覧
  projects: function(){
    return Projects.find({});
  },
  //表示月
  viewmonth: function(){
    var viewmonth = Session.get('viewmonth');
    return viewmonth.getFullYear() +'-'
        + parseDate(viewmonth.getMonth()+1) + '-' + parseDate(viewmonth.getDate());
  }
});

//タイムラインの更新
Template.projectview.rendered = function(){
  updateTimeline();
};

function updateTimeline(){
  var viewmonth = Session.get('viewmonth');
  var dayspan = Session.get('dayspan');
  //キャンバスを取得
  var cvs = $('#cvs_timeline');
  var startday = 0; //7日前からタイムラインを開始する
  //サイズ設定
  var width = TIMELINEDAYS*dayspan;// - HEADWIDTH;
  if(width>document.documentElement.clientWidth) width = document.documentElement.clientWidth;
  cvs.get(0).width = width - HEADWIDTH;
  cvs.get(0).height = 60;
  $('nav').width(width);//+HEADWIDTH);
  //描画
  var ctx = cvs.get(0).getContext('2d');
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  ctx.font = '30px  Arial';
  ctx.fillStyle = '#aaa';
  //目盛りと日付を描画
  for(var i=0; i<=TIMELINEDAYS; i++){
    if(i%7==0){
      //週頭の目盛り
      ctx.beginPath();
      ctx.moveTo(i*dayspan, 0);
      ctx.lineTo(i*dayspan, 60);
      ctx.stroke();
      var date = new Date(viewmonth.getTime() + i*ONEDAYMILI);
      ctx.fillText((date.getMonth()+1) + '/' + date.getDate(), i*dayspan, 30);
      //console.log((date.getMonth()+1) + '/' + date.getDate());
    } else {
      //日の目盛り
      ctx.beginPath();
      ctx.moveTo(i*dayspan, 50);
      ctx.lineTo(i*dayspan, 60);
      ctx.stroke();      
    }
  }
  //今日の日付
  ctx.strokeStyle = '#68f';
  var today = new Date();
  today.setHours(9);
  today.setMinutes(0);
  today.setSeconds(0);  
  // console.log('++' + today);
  // console.log('++' + today.getTime());
  var todayval = today.getTime() - viewmonth.getTime();
  todayval /= (ONEDAYMILI);
  todayval = Math.round(todayval) * dayspan;
  // console.log('++' + todayval);
  ctx.beginPath();
  ctx.moveTo(todayval, 50);
  ctx.lineTo(todayval, 60);
  ctx.stroke();  
  ctx.fillStyle = '#68f';
  ctx.font = '14px  Arial';
  ctx.fillText('today', todayval-16, 44);
}

//プロジェクトビューのイベント
Template.projectview.events({
  //画面上のタスクがクリックされた
  'click .task': function(){
    var target = $(event.target);
    if(!target.hasClass('task')){
      target = target.parents('.task');
    }
    // console.log('taskid:' + target.attr('id'));
    Session.set('selectedtask', target.attr('id'));
    //選択強調
    $('.selectedtask').removeClass('selectedtask');
    target.addClass('selectedtask');
  },
  //プロジェクトがクリックされた
  'click .project': function(){
    var target = $(event.target);
    target = target.parents('.project');
    // console.log('prjid:' + target.attr('id'));
    Session.set('selectedproject', target.attr('id'));
    //選択強調
    $('.selectedproject').removeClass('selectedproject');
    target.addClass('selectedproject');
  },
  //表示日が変更された
  'change #viewmonth': function(){
    var viewmonth = new Date($(event.target).val());
    var day = viewmonth.getDay()-1;
    if(day<0)day+=7;
    viewmonth.setTime(viewmonth.getTime() - day*ONEDAYMILI);
    viewmonth.setHours(9);
    viewmonth.setMinutes(0);
    viewmonth.setSeconds(0);
    Session.set('viewmonth', viewmonth);
    updateTimeline();
    updateAllProjectArea(Tasks);
  },
  //ボタンによるシフト
  'click #btn_leftshift': function(){
    var viewmonth = new Date($('#viewmonth').val());
    viewmonth.setTime(viewmonth.getTime() - ONEDAYMILI * 7);
    Session.set('viewmonth', viewmonth);    
    updateTimeline();
    updateAllProjectArea(Tasks);
  },
  //ボタンによるシフト
  'click #btn_rightshift': function(){
    var viewmonth = new Date($('#viewmonth').val());
    viewmonth.setTime(viewmonth.getTime() + ONEDAYMILI * 7);
    Session.set('viewmonth', viewmonth);    
    updateTimeline();
    updateAllProjectArea(Tasks);
  }

});

//プロジェクトテンプレートのヘルパー
Template.project.helpers({
  //プロジェクトが持つタスクの一覧を取得
  tasks: function(){
    return Tasks.find({'prid': this._id});
  }
});

//タスクテンプレートのヘルパー
Template.task.helpers({
  //整形した締め切り日を返す
  formatdeadline: function(){
    return (this.dl.getMonth()+1) + '/' + this.dl.getDate();
  },
  //整形したユーザー名を返す
  formatname: function(){
    return Meteor.users.findOne({'_id': this.us}).username;
  },
  //ミリ秒での締め切り日を返す
  // milideadline: function(){
  //   console.log('::'+this.dl);
  //   console.log('::'+Math.round(this.dl.getTime()/ONEDAYMILI));
  //   return Math.round(this.dl.getTime()/ONEDAYMILI);
  // },
  //タスクのx位置を返す
  taskxpos: function(){
    var viewmonth = Session.get('viewmonth');
    var dayspan = Session.get('dayspan');
    var startdate = Math.round(viewmonth.getTime() / ONEDAYMILI);
    var x = Math.round(this.dl.getTime()/ONEDAYMILI)
    var w = $('#'+this._id).outerWidth();
    if(!w) w = 60;
    return (x - startdate + 1)*dayspan - w;
  },
  //タスクのブランチ位置を返す
  taskypos: function(){
    if(this.brpos){
      return this.brpos * 60;
    } else {
      return 0;
    }
  }
});

//プロジェクトビューのレンダー
Template.project.rendered = function(){
  updateProjectArea(this.firstNode.id, Tasks);
};


