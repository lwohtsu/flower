//初期設定
Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});
Session.set('taskquery', 'open');
Session.set('selectedproject', null);
Session.set('selectedtask', null);
Session.set('viewmonth', new Date());

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

//選択していないときはフォームのコントロールを無効にする
// Template.projectform.rendered = function(){
//   if(Session.get('selectedproject') == ''){
//     $('#projectform form input').attr('disabled', 'disabled');
//     $('#projectform form button').attr('disabled', 'disabled');
//   } else {
//     $('#projectform form input').removeAttr('disabled');
//     $('#projectform form button').removeAttr('disabled');
//   }
// };
// Template.taskform.rendered = function () {
//   if(Session.get('selectedtask') == ''){
//     $('#taskform form input').attr('disabled', 'disabled');
//     $('#taskform form button').attr('disabled', 'disabled');
//   } else {
//     $('#taskform form input').removeAttr('disabled');
//     $('#taskform form button').removeAttr('disabled');
//   }
// };

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
        + parseDate(viewmonth.getMonth()+1);
    }
});
function parseDate(num) {
  return ((num + "").length == 1) ? "0" + num : num;
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
  }
});


