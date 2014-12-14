/*client_form.js
クライアント用コード。フォームに関するもの中心。
*/

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
    bootbox.confirm("Delete '" + this.nm + "'' Project?", function(result) {
      if(result){
        Meteor.call('deleteProject', projectid);
      }
    }); 
    return false;
  },
  //プロジェクト名変更
  'change #projectname': function(event) {
    // console.log(this._id + ' projectname as "' + $(event.target).val());
    Meteor.call('updateProjectName', this._id, $(event.target).val());
    return false;
  },
  //プロジェクトにユーザー追加
  'change #projectusers': function(event){
    var name = $(event.target).val();
    //リアルユーザーを追加
    var user = Meteor.users.findOne({username: name});
    if(user){
      Meteor.call('addUserToProject', this._id, user._id);
    }
    $(event.target).val('');
    return false;
  },
  //プロジェクトをクローズ
  'change #closeproject': function(event){
    if(!this.closed) {
        Meteor.call("updateProjectClosed", this._id, true);
    } else {
        Meteor.call("updateProjectClosed", this._id, ! this.closed);
    }
  },
  //enterによるsubmitをすべて無効に
  'submit': function(event){
    return false;
  }
});

//プロジェクトユーザーのイベント
Template.projectuser.events({
  //ユーザーの削除
 'click .del-item': function(event){
    var prid = Session.get('selectedproject');
    var uid = $(event.currentTarget).data('userid');
    // console.log(event.currentTarget);
    // console.log(uid);
    if(prid){
      if(uid){
        console.log('delete ' + uid + ' from ' + prid);
        Meteor.call('removeUserFromProject', prid, uid);
      }
    }
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
        // updateProjectArea(prid, Tasks);
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
        // updateProjectArea(prid, Tasks);
      });
    return false;
  },
  //タスクの削除
  'click #btn_deltask': function(event){
    if(Tasks.find({'prid': this.prid}).count()<=1) return false;
    var prid = this.prid;
    Meteor.call('deleteTask', this._id);
    // , function(error, result){
    //   // TODO：ブランチの配置を調整し、行高調整して背景の線をリドローする
    //   updateProjectArea(prid, Tasks);      
    // });
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
    $(event.target).parents('.form-group').removeClass('has-error');
    //リアルユーザー→バーチャルユーザーの順で該当するユーザーを探す
    var name = $(event.target).val();
    var user = Meteor.users.findOne({username: name});
    if(!user) user = Virtuals.findOne({username: name});
    if(user){
      Meteor.call('updateTaskUser', this._id, user._id);
    } else {
      //該当ユーザーがいない時は更新しないでフォームを赤に
      $(event.target).parents('.form-group').addClass('has-error');
    }
    return false;
  },
  //デッドラインの更新
  'change #tsk_deadline': function(event){
      var val = new Date($(event.target).val());
      var prid = this.prid;
      Meteor.call('updateTaskDeadline', this._id, val, true);
      // , function(error, result){
      //   // TODO：ブランチの配置を調整し、行高調整して背景の線をリドローする
      //   updateProjectArea(prid, Tasks);      
      // });
      return false;
  },
  //幅の更新
  'change #tsk_span': function(event){
      var prid = this.prid;
      Meteor.call('updateTaskSpan', this._id, $(event.target).val());
      // ,
      //  function(error, result){
      //     // TODO：ブランチの配置を調整し、行高調整して背景の線をリドローする
      //     updateProjectArea(prid, Tasks);      
      // });
      return false;
  },
  //ステータス変更
  'click input[name="taskStatusRadio"]': function(event){
    Meteor.call('updateTaskStatus', this._id, $(event.target).val());
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
    // console.log(Meteor.users.find({}));
    return Meteor.users.find({}, {sort:{username:1}});
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
  },
  //クローズかどうか
  projectclosed: function(){
    if(!this.closed) return null;
    if(this.closed===true) return 'checked';
  }
});

//タスクフォームのヘルパー
Template.taskform.helpers({
  //ユーザー一覧
  realusers: function(){
    return Meteor.users.find({}, {sort:{username:1}});
  },
  virtualusers: function(){
    return Virtuals.find({}, {sort:{username:1}});
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
    var user = Meteor.users.findOne({'_id': this.us});
    if(user) return user.username;
    return Virtuals.findOne({'_id': this.us}).username;
  },    
  //整形した締め切り日を返す
  formatdeadline: function(){
      return this.dl.getFullYear() +'-' + 
        parseDate(this.dl.getMonth()+1) + '-' +
        parseDate(this.dl.getDate());
  },
  //幅
  spandate: function(){
    return this.span;
  },
  //ステータス
  statuschecked1: function(){
    if(!this.stus) return 'checked';
    if(this.stus == '0') return 'checked';
    return null;
  },
  statuschecked2: function(){
    if(this.stus) if(this.stus == '50') return 'checked';
    return null;
  },
  statuschecked3: function(){
    if(this.stus) if(this.stus == '100') return 'checked';
    return null;
  },
  statuschecked4: function(){
    if(this.stus) if(this.stus == '-1') return 'checked';
    return null;
  },
});

// マンスフォーム（表示月の変更など）
Template.monthform.helpers({
  //表示月
  viewmonth: function(){
    var viewmonth = Session.get('viewmonth');
    return viewmonth.getFullYear() +'-' + 
      parseDate(viewmonth.getMonth()+1) + '-' + parseDate(viewmonth.getDate());
  }
});
Template.monthform.events({
  //表示日が変更された
  'change #viewmonth': function(event){
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
  'click #btn_leftshift': function(event){
    var viewmonth = new Date($('#viewmonth').val());
    viewmonth.setTime(viewmonth.getTime() - ONEDAYMILI * 7);
    Session.set('viewmonth', viewmonth);    
    updateTimeline();
    updateAllProjectArea(Tasks);
  },
  //ボタンによるシフト
  'click #btn_rightshift': function(event){
    var viewmonth = new Date($('#viewmonth').val());
    viewmonth.setTime(viewmonth.getTime() + ONEDAYMILI * 7);
    Session.set('viewmonth', viewmonth);    
    updateTimeline();
    updateAllProjectArea(Tasks);
  }
});


// セッティング画面ヘルパー
Template.settingpanel.helpers({
  // ユーザー名
  username: function(){
    return Meteor.user().username;
  }, 
  // リアル名
  realname: function(){
    return Meteor.user().profile.name;
  },
  virtuals: function(){
    // console.log(Virtuals.find({}).count());
    return Virtuals.find({}, {sort:{username:1}});
  }
});
// セッティング画面イベント
Template.settingpanel.events({
  // ユーザーのリアル名設定
  'change #realname': function(event){
    Meteor.call('updateRealName', $(event.target).val());
    return false;    
  },
  //バーチャルユーザーの追加
  'click #btn_addvirtual': function(event){
    var vname = $('#new-v-username').val();
    var vrname = $('#new-v-realname').val();
    if(vname !== ''){
      if(Virtuals.find({username: vname}).count()===0){
        if(vname.charAt(0)=='_'){
            console.log(vname + ':' + vrname);
            Meteor.call('addVirtualUser', vname, vrname, function(){
                $('#new-v-username').val('');
                $('#new-v-realname').val('');            
            });            
        }
      }
    }
  },
  //バーチャルユーザーのリアル名変更
  'change .v-realname': function(event){
    var newname = $(event.target).val();
    Meteor.call('updateVirtualRealName', $(event.target).data('vid'), newname);
  },
  //enterによるsubmitをすべて無効に
  'submit': function(event){
    return false;
  }
});


// ユーザーフォーム
Template.userform.helpers({
  //ユーザー一覧
  realusers: function(){
    return Meteor.users.find({}, {sort:{username:1}});
  },
  virtualusers: function(){
    return Virtuals.find({}, {sort:{username:1}});
  },
  //現在のユーザー
  currentuser: function(){
    var user = Meteor.users.findOne({_id: Session.get('selecteduser')});
    if(!user) user = Virtuals.findOne({_id: Session.get('selecteduser')});
    if(user) return user.username;
  }
});
Template.userform.events({
  //担当ユーザーの更新
  'change #userviewselector': function(event){
    //リアルユーザー→バーチャルユーザーの順で該当するユーザーを探す
    var name = $(event.target).val();
    var user = Meteor.users.findOne({username: name});
    if(!user) user = Virtuals.findOne({username: name});
    if(user){
        Session.set('selecteduser', user._id);
    }
    return false;
  },
  //enterによるsubmitをすべて無効に
  'submit': function(event){
    return false;
  }
});
