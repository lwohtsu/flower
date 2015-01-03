/*client.js
クライアント用コード。ビューに関するもの中心。
*/

//初期設定
Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});
Session.set('taskquery', 'open');
Session.set('selectedproject', null);
Session.set('selectedtask', null);

Session.set('selecteduser', Meteor.userId());

Session.set('singlemode', false);

//その週の月曜から開始するように調整
var viewmonth = new Date();
var day = viewmonth.getDay()-1;
if(day<0)day+=7;
viewmonth.setTime(viewmonth.getTime() - day*ONEDAYMILI);
viewmonth.setHours(9);
viewmonth.setMinutes(0);
viewmonth.setSeconds(0);
Session.set('viewmonth', viewmonth);

Session.set('dayspan', DAYSPAN_DEF); //タイムライン1日＝40pxが初期値
Session.set('timelinedays', TIMELINEDAYS_DEF);  //初期値は29

//バーチャルズは架空のユーザー。プロジェクト管理に参加しないユーザーやクライアントを表す
Projects = new Mongo.Collection("projects");
Tasks = new Mongo.Collection("tasks");
Virtuals = new Mongo.Collection('virtuals');
Meteor.subscribe("projects");
Meteor.subscribe("tasks");
Meteor.subscribe("virtuals");
Meteor.subscribe("users");

//body内のヘルパー
Template.body.helpers({
  //現在のクエリーを表示（テスト用）
  taskquery: function () {
    return Session.get('taskquery');
  },
  userview: function(){
    if(Session.get('taskquery')=='userview') return true;
    return false;
  }
});


//body内のイベント処理
Template.body.events({
    //メインタブ切り替え
    "click #maintab a": function (event) {
      event.preventDefault();
      var targetlink = $(event.target);
      var targetid = targetlink.attr('href');
      var taskquery = targetlink.data('query'); //絞り込み情報
      if(taskquery !== undefined){
        Session.set('taskquery', taskquery);
      }
      //アクティブの付け替え
      $('#maintab .active').removeClass('active');
      $('.tab-content .active').removeClass('active');
      targetlink.parent('li').addClass('active');
      $('.tab-content ' + targetid).addClass('active');
      //プロジェクトエリアの更新
      if(taskquery != 'setting') {
        Meteor.setTimeout(function() {
          updateAllProjectArea(Tasks);
          //選択解除
          Session.set('selectedproject', null);
          Session.set('selectedtask', null);
          deselectTask();
          $('.selectedproject').removeClass('selectedproject');    
        }, 300); 
      }
      // window.location.hash = taskquery;
      return false;
    },
    //コンソールの表示非表示
    'click #btn_showconsole': function(event){
      $('#consolearea').slideToggle();
    },
    // シングルモード
    'change #singlemode': function(event){
      if(event.target.checked){
        Session.set('singlemode', true);
      } else {
        Session.set('singlemode', false);
      }
    },
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
    if(Session.get('taskquery')==='closed'){
      return Projects.find({closed: true}, {sort: {create:1}});
    }
    var selproj = Session.get('selectedproject');
    if(selproj && Session.get('singlemode')){
      return Projects.find({closed: {$ne:true}, _id: selproj}, {sort: {create:1}});
    }
    return Projects.find({closed: {$ne:true}}, {sort: {create:1}});      
  },
});

//タイムラインの更新
Template.projectview.rendered = function(){
  updateTimeline();
  resizeAllArea();
  sortPinnedProject();

  //リサイズイベント
  var resizetimer = null;
  $(window).resize(function() {
      Meteor.clearTimeout(resizetimer);
      resizetimer = Meteor.setTimeout(function() {
        resizeAllArea();
        updateTimeline();
        updateAllProjectArea(Tasks);
      }, 500);
  });

  //スクロールイベント
  var scrolltimer = null;
  $('#listarea').scroll(function(event){
    Meteor.clearTimeout(scrolltimer);
    scrolltimer  = Meteor.setTimeout(function(){
      var st = $('#listarea').scrollTop();
      if(st > 20){
        $('#cvs_timeline').css('top', st);
        $('#btn_zoom').css('top', st);
      } else {
        $('#cvs_timeline').css('top', 0);
        $('#btn_zoom').css('top', 0);
      }
      var sl = $('#listarea').scrollLeft();
      // console.log('sl:' + sl);
    }, 500);
  });

  //ショートカットキーのイベント処理
  $(document).keyup(function(event){
    if($(':focus').prop("tagName") == 'INPUT') return;

    // console.log('shortcut' + event.keyCode);
    //タスク非選択時はタイムラインのスクロール
    var viewmonth = new Date($('#viewmonth').val());
    var seltaskid = Session.get('selectedtask');
    if(seltaskid == null){
      if(!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey){
        switch(event.keyCode){
          case 37:      //左へ
            viewmonth.setTime(viewmonth.getTime() - ONEDAYMILI * 7);
            Session.set('viewmonth', viewmonth);    
            updateTimeline();
            updateAllProjectArea(Tasks);
            return false;          
            break;
          case 39:      //右へ
            viewmonth.setTime(viewmonth.getTime() + ONEDAYMILI * 7);
            Session.set('viewmonth', viewmonth);    
            updateTimeline();
            updateAllProjectArea(Tasks);
            return false;
            break;
        }
      }
    } else {
      //タスク選択時はタスクの操作
      var task = Tasks.findOne({_id: seltaskid});
      // console.log(task);
      //修飾キーは何も押されていない
      if(!event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey){
        switch(event.keyCode){
          case 37: //左へタスクを移動（deadline変更）
            task.dl.setTime(task.dl.getTime() - ONEDAYMILI);
            // ユーザービューのときは子タスクを連動しない
            if(Session.get('taskquery')==='userview'){
              Meteor.call('updateTaskDeadline', task._id, task.dl, false);
            } else {
              Meteor.call('updateTaskDeadline', task._id, task.dl, true);
            }
            return false;
            break;
          case 39: //右へタスクを移動（deadline変更）
            task.dl.setTime(task.dl.getTime() + ONEDAYMILI);
            // ユーザービューのときは子タスクを連動しない
            if(Session.get('taskquery')==='userview'){
              Meteor.call('updateTaskDeadline', task._id, task.dl, false);
            } else {
              Meteor.call('updateTaskDeadline', task._id, task.dl, true);
            }
            return false;
            break;        
        }
      } else if(!event.ctrlKey && !event.altKey && !event.metaKey && event.shiftKey){
        //shiftキーとカーソル左右の組み合わせのときは幅を変更
        switch(event.keyCode){
          case 37: //タスクの幅を拡げる
            var w = task.span;
            if(!w) w = 1;
            w++;
            Meteor.call('updateTaskSpan', task._id, w);            
            return false;
            break;
          case 39: //右へタスクを移動（deadline変更）
            var w = task.span;
            if(!w) break;
            if(w <= 1) break;
            w--;
            Meteor.call('updateTaskSpan', task._id, w);
            return false;
            break;          
        }
      } else if(!event.ctrlKey && event.altKey && !event.metaKey && !event.shiftKey){
        //altキーとカーソル左右の組み合わせのときは1つのタスクのみ移動
        switch(event.keyCode){
          case 37: //左へタスクを移動（deadline変更）
            task.dl.setTime(task.dl.getTime() - ONEDAYMILI);
            Meteor.call('updateTaskDeadline', task._id, task.dl, false);
            return false;
            break;
          case 39: //右へタスクを移動（deadline変更）
            task.dl.setTime(task.dl.getTime() + ONEDAYMILI);
            Meteor.call('updateTaskDeadline', task._id, task.dl, false);
            return false;
            break;     
          case 40: //タスクをブランチの最下段へ   
            console.log('bringToLastBranch'); 
            Meteor.call('bringToLastBranch', task._id);
            return false;
            break;
          case 38: //タスクをブランチの最上段へ    
            console.log('bringToFirstBranch'); 
            Meteor.call('bringToFirstBranch', task._id);
            return false;
            break;
        }
      }
    }
    return;
  });
};



//プロジェクトビューのイベント
Template.projectview.events({
  //画面上のタスクがクリックされた
  'click .task': function(event){
    var target = $(event.target);
    if(!target.hasClass('task')){
      target = target.parents('.task');
    }
    // console.log('taskid:' + target.attr('id'));
    Session.set('selectedtask', target.attr('id'));
    //選択強調
    deselectTask();
    selectTask(target);
  },
  //プロジェクトがクリックされた
  'click .project': function(event){
    var target = $(event.target);
    target = target.parents('.project');
    // console.log('prjid:' + target.attr('id'));
    Session.set('selectedproject', target.attr('id'));
    //選択強調
    $('.selectedproject').removeClass('selectedproject');
    target.addClass('selectedproject');
  },
  //タイムラインがクリックされた
  'click #cvs_timeline': function(event){
    Session.set('selectedproject', null);
    Session.set('selectedtask', null);
    //選択強調
    deselectTask();
    $('.selectedproject').removeClass('selectedproject');    
    return false;
  },
  //ズームボタン
  'click #btn_zoom': function(event){
    var icon = $('#btn_zoom .glyphicon');
    if(icon.hasClass('glyphicon-resize-small')){
      icon.removeClass('glyphicon-resize-small');
      icon.addClass('glyphicon-resize-full');
      Session.set('dayspan', DAYSPAN_WIDE); 
      Session.set('timelinedays', TIMELINEDAYS_WIDE);
      updateTimeline();
      updateAllProjectArea(Tasks);
    } else {
      icon.removeClass('glyphicon-resize-full');
      icon.addClass('glyphicon-resize-small');
      Session.set('dayspan', DAYSPAN_DEF); 
      Session.set('timelinedays', TIMELINEDAYS_DEF);
      updateTimeline();
      updateAllProjectArea(Tasks);
    }
  },
  // プロジェクト固定ボタン
  'click .btn-pinned': function(event){
    var pinned = Meteor.user().pinned;
    var pid = this._id;
    if(!pinned) pinned = [pid];
    else {
      //数が10個以上あるなら減らす
      if(pinned.length > 9){
        pinned.shift();
      }
      // すでに配列にあるなら削除し、末尾に追加
      pinned.some(function(v, i){
        if (v==pid) pinned.splice(i,1);    
      });
      pinned.push(pid);
    }
    Meteor.call('updatePinnedList', pinned, function(){
      // console.log(pinned);
      sortPinnedProject();
    });
  },
});



//プロジェクトテンプレートのヘルパー
Template.project.helpers({
  //プロジェクトが持つタスクの一覧を取得
  tasks: function(){
    var result;
    // userviewモードのときは特定のユーザーのタスクのみを表示する
    if(Session.get('taskquery')==='userview'){
      var assignie= Session.get('selecteduser');
      result = Tasks.find({prid: this._id, us: assignie, mbr:{$ne: true}}, {sort: {dl:1}});
    } else {
      result = Tasks.find({prid: this._id}, {sort: {dl:1}});
    }
    //他のユーザーによるタスク更新を感知
    var observetimer = null;
    result.observe({
      added: function (doc) {
        var sdoc = doc;
        Meteor.clearTimeout(observetimer);
        observetimer  = Meteor.setTimeout(function(){
          console.log('observe added');
          updateProjectArea(sdoc.prid, Tasks);          
        }, 500);
      },
      changed: function (newdoc, olddoc) {
        var sdoc = newdoc;
        Meteor.clearTimeout(observetimer);
        observetimer  = Meteor.setTimeout(function(){
          console.log('observe updated');
          updateProjectArea(sdoc.prid, Tasks);
        }, 500);
      },
      removed: function(olddoc){
        console.log('observe removed');
        updateProjectArea(olddoc.prid, Tasks);        
      }
    });
    //結果を返す
    return result;
  }
});

//タスクテンプレートのヘルパー
Template.task.helpers({
  //整形した締め切り日を返す
  formatdeadline: function(){
    if(this.span){
      return (this.dl.getMonth()+1) + '/' + this.dl.getDate() + '(' + this.span + ')';
    }
    return (this.dl.getMonth()+1) + '/' + this.dl.getDate();
  },
  //整形したユーザー名を返す
  formatname: function(){
    var user = Meteor.users.findOne({'_id': this.us});
    if(user){
      if(user.profile){
        if(user.profile.name) return user.profile.name;
      }else return user.username;
    }
    user = Virtuals.findOne({'_id': this.us});
    if(user){
      if(user.realname) return user.realname;
      return user.username;
    }
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
    var x = Math.round(this.dl.getTime()/ONEDAYMILI);
    var w = dayspan;
    if(this.span){
      w = this.span * dayspan;
    }
    if(w<DAYSPAN_MIN) w = DAYSPAN_MIN;
    return (x - startdate + 1)*dayspan - w;
  },
  //タスクのブランチ位置を返す
  taskypos: function(){
    //userviewモードのときはブランチによる移動をしない
    if(Session.get('taskquery')==='userview'){
      return TASKSHIFTDOWN;
    }
    if(this.brpos){
      return this.brpos * 60 + TASKSHIFTDOWN;
    } else {
      return TASKSHIFTDOWN;
    }
  },
  //タスクの幅を返す
  taskw: function(){
    var dayspan = Session.get('dayspan');
    var w = dayspan;
    if(this.span){
      w = this.span * dayspan;
    }
    if(w<DAYSPAN_MIN) w = DAYSPAN_MIN;
    return w;
  },
  //ステータスを返す
  taskstatus: function(){
    if(!this.stus) return 'task-status0';
    // console.log(this.stus);
    if(this.stus==0) return 'task-status0';
    if(this.stus==50) return 'task-status50';
    if(this.stus==100) return 'task-status100';
    if(this.stus==-1) return 'task-status-1';
  },
});

//プロジェクトビューのレンダー
Template.project.rendered = function(){
  updateProjectArea(this.firstNode.id, Tasks);
};


