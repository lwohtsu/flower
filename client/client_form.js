//プロジェクトフォームのイベント
Template.projectform.events({
  //新規プロジェクト追加
  'click #btn_newproj': function (event) {
    Meteor.call('addNewProject');
    return false;
  },
  //プロジェクト削除
  'click #btn_delproj': function(event){
    var projectid = this._id;
    bootbox.confirm("Delete this Project?", function(result) {
      Meteor.call('deleteProject', projectid);
    }); 
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
    var prid = this.prid;
    Meteor.call('addNewTask', this.prid, this._id, this.mbr, this.dl,
      function(error, result){
        //新規タスクを選択した状態にする
        var target = $('#'+result);
        Session.set('selectedtask', result);
        //選択強調
        $('.selectedtask').removeClass('selectedtask');
        target.addClass('selectedtask');
        // TODO：ブランチの配置を調整し、行高調整して背景の線をリドローする
        updateProjectArea(prid, Tasks);
      });
    return false;
  },
  //ブランチを分けてタスクを追加
  'click #btn_addbranch': function(event){
    var brpos = this.brpos;
    //親がbrposを持たないなら1に、持っているなら+1する
    if(!this.brpos) brpos = 1; else brpos++;
    var prid = this.prid;

    Meteor.call('addNewTaskWithBranch', this.prid, this._id, this.dl, this.brpos,
      function(error, result){
        //新規タスクを選択した状態にする
        var target = $('#'+result);
        Session.set('selectedtask', result);
        //選択強調
        $('.selectedtask').removeClass('selectedtask');
        target.addClass('selectedtask');
        // TODO：ブランチの配置を調整し、行高調整して背景の線をリドローする
        updateProjectArea(prid, Tasks);
      });
    return false;
  },
  //タスクの削除
  'click #btn_deltask': function(event){
    if(Tasks.find({'prid': this.prid}).count()<=1) return false;
    var prid = this.prid;
    Meteor.call('deleteTask', this._id, function(error, result){
      // TODO：ブランチの配置を調整し、行高調整して背景の線をリドローする
      updateProjectArea(prid, Tasks);      
    });
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
      var val = new Date($(event.target).val());
      var prid = this.prid;
      Meteor.call('updateTaskDeadline', this._id, val, function(error, result){
        // TODO：ブランチの配置を調整し、行高調整して背景の線をリドローする
        updateProjectArea(prid, Tasks);      
      });
      return false;
  },
  //enterによるsubmitをすべて無効に
  'submit': function(event){
    return false;
  }
});
//日付変更時にタスクを動かす（値の変更ではリアクションが起きないみたい）
// var ONEDAYMILI = 24*60*60*1000;
// function AdjustTask(id, x){
//   console.log('modify task');
//   var viewmonth = Session.get('viewmonth');
//   var dayspan = Session.get('dayspan');
//   var startdate = Math.round(viewmonth.getTime() / ONEDAYMILI);
//   var elem = $('#'+id);
//   console.log(elem);
//   console.log(x);
//   var w = elem.outerWidth();
//   elem.css('left', ((x - startdate)*dayspan) - w + 'px');  
// }


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
