//初期設定
Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});
Session.set('taskquery', 'open');
Session.set('selectedproject', '');
Session.set('selectedtask', '');

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
Template.projectform.rendered = function(){
  if(Session.get('selectedproject') == ''){
    $('#projectform form input').attr('disabled', 'disabled');
    $('#projectform form button').attr('disabled', 'disabled');    
  } else {
    $('#projectform form input').removeAttr('disabled');
    $('#projectform form button').removeAttr('disabled');        
  }
};

