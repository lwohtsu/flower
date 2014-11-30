//プロジェクトフォームのイベント
Template.projectform.events({
  //新規プロジェクト追加
  'click #btn_newproj': function (event) {
    Meteor.call('addNewProject');
    return false;
  },
  //プロジェクト名変更
  'change #projectname': function(event) {
    // console.log(this._id + ' projectname as "' + $(event.target).val());
    Meteor.call('updateProjectName', this._id, $(event.target).val());
    return false;
  },
  //enterによるsubmitをすべて無効に
  'submit': function(event){
    return false;
  }
});
//タスクフォームのイベント
Template.taskform.events({
  //新規タスクの追加
  'click #btn_addtask' : function(event){
    Meteor.call('addNewTask', this.prid, this._id, this.mbr);
    return false;
  },
  //タスクの削除
  'click #btn_deltask': function(event){
    if(Tasks.find({'prid': this.prid}).count()<=1) return false;
    Meteor.call('deleteTask', this._id);
    return false;
  },
  //タスクタイトルの更新
  'change #tasktitle': function(event) {
    // console.log(this._id + ' projectname as "' + $(event.target).val());
    Meteor.call('updateTaskTitle', this._id, $(event.target).val());
    return false;
  },  
  //担当ユーザーの更新
  'change #tsk_assignee': function(event){
    $(event.target).parents('.form-group').removeClass('has-error')
    //リアルユーザー→バーチャルユーザーの順で該当するユーザーを探す
    var name = $(event.target).val();
    var user = Meteor.users.findOne({username: name});
    console.log('real: ' +user);
    if(!user) user = Virtuals.findOne({username: name});
    console.log('virtuals: ' +user);
    if(user){
      Meteor.call('updateTaskUser', this._id, user._id);
    } else {
      //該当ユーザーがいない時は更新しないでフォームを赤に
      $(event.target).parents('.form-group').addClass('has-error')
    }
    return false;
  },
  //デッドラインの更新
  'change #tsk_deadline': function(event){
      Meteor.call('updateTaskDeadline', this._id, new Date($(event.target).val()));
      return false;
  },
  //enterによるsubmitをすべて無効に
  'submit': function(event){
    return false;
  }
});

//プロジェクトフォームのヘルパー
Template.projectform.helpers({
  //ユーザー一覧
  realusers: function(){
    return Meteor.users.find({});
  },
  //カレントプロジェクト
  currentproject: function(){
    var prid = Session.get('selectedproject');
    // console.log(prid);
    if(prid){
      return Projects.findOne({'_id': prid});
    } else 
    return null;
  },
  //参加ユーザーの一覧
  member: function(){
    return Meteor.users.find({'_id': {$in: this.urs}});
  }
});
//タスクフォームのヘルパー
Template.taskform.helpers({
  //ユーザー一覧
  realusers: function(){
    return Meteor.users.find({});
  },
  virtualusers: function(){
    return Virtuals.find({});
  },
  //カレントタスク
  currenttask: function(){
    var tkid = Session.get('selectedtask');
    // console.log(tkid);
    if(tkid){
      return Tasks.findOne({'_id': tkid});
    } else 
    return null;
  },
  //整形したユーザー名を返す
  formatname: function(){
    return Meteor.users.findOne({'_id': this.us}).username;
  },    
  //整形した締め切り日を返す
  formatdeadline: function(){
      return this.dl.getFullYear() +'-'
        + parseDate(this.dl.getMonth()+1) + '-' 
        + parseDate(this.dl.getDate());
  },
});

function parseDate(num) {
  return ((num + "").length == 1) ? "0" + num : num;
}
