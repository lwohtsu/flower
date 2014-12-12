/*comatibilitiy.js
クライアントの共通コードを記述する。client/compatibilityフォルダに入れる必要あり。
*/

//タイムライン更新用定数
var HEADWIDTH = 0;
//1日
var ONEDAYMILI = 24*60*60*1000;
//タイムラインの表示期間（日数）
var TIMELINEDAYS_DEF = 50;
var TIMELINEDAYS_WIDE = 120;
//1日の幅（ピクセル）
var DAYSPAN_DEF = 30;
var DAYSPAN_WIDE = 15;
var DAYSPAN_MIN = 20;

var TASKSHIFTDOWN = 28;

// 倍率変更している場合、逆変換
var ZOOMREVERSE = 1;


//リサイズ
function resizeAllArea(){
	var hh = $('header').height();
	var sh = window.innerHeight ;
	$('#listarea').height(sh - hh);
	$('#consolearea').height(sh - hh);
}


//日付をゼロパディングする
function parseDate(num) {
  return ((num + "").length == 1) ? "0" + num : num;
}

function updateAllProjectArea(tasks){
	$('.project').each(function(index, element){
		updateProjectArea(element.id, tasks);
	});
}

//プロジェクトを整形する
//プロジェクトの高さを拡げ、タスクが重ならないよう移動し、最後に接続線を引く
function updateProjectArea(projid, tasks){
	// console.log(projid);
	// console.log(tasks.find({prid: projid, str: true}).count());
	//プロジェクトに含まれる全タスクを取得
	var taskcol = tasks.find({prid: projid});
	//タスクのコレクションから連想配列を作成（たぶんこのほうがアクセス早い）
	var taskary = [];
	var startid;
	taskcol.forEach(function(task){
		taskary[task._id] = task;
		if(task.str) startid = task._id;	//開始タスクを探す
	});
	//console.log(taskary);
	//ラインリスト
	var lineary = [];
	//探索開始
	// console.log('start');
	exploreTask(taskary[startid], 0, taskary, lineary);
	var maxbrpos = 0;
	//一番大きいmaxbrposを探す
	for(var i in taskary){
		// console.log(taskary[i].brpos);
		//brposが変更されていた場合はdbも更新
		if(taskary[i].brupdate){
			Meteor.call('updateTaskBrpos', i, taskary[i].brpos);
		}
		if(maxbrpos < taskary[i].brpos) maxbrpos = taskary[i].brpos;
	}
	// console.log(maxbrpos);
	//プロジェクトの高さを拡張
	var area = $('#'+projid);
	//サイズ設定
	var dayspan = Session.get('dayspan');
	var timelinedays = Session.get('timelinedays');
	var width = (timelinedays)*dayspan;
	if(width>$('#listarea').width()*ZOOMREVERSE) width = $('#listarea').width()*ZOOMREVERSE;
	area.width(width);
	var height = (maxbrpos+1) * 60 + 18 + TASKSHIFTDOWN;
	area.height(height);
	var cvs = area.find('.project-cvs');
	if(! cvs.get(0)) return;	//エラー対応
	cvs.get(0).height = height;
	cvs.get(0).width = width;
	// cvs.css('top', TASKSHIFTDOWN);
	var ctx = cvs.get(0).getContext('2d');
	//土日をグレーアウト
	ctx.fillStyle = '#eee';
	for(var i=0; i<=timelinedays; i++){
		if(i%7>4){
			ctx.fillRect(i*dayspan, 0, dayspan, height);
		}
	}

	//接続線の描画
	// console.log(lineary);
	var viewmonth = Session.get('viewmonth');
	var dayspan = Session.get('dayspan');
	var startdate = Math.round(viewmonth.getTime() / ONEDAYMILI);
	//今日の線
	var today = new Date();
	today.setHours(9);
	today.setMinutes(0);
	today.setSeconds(0);  
	var todayval = today.getTime() - viewmonth.getTime();
	todayval /= (ONEDAYMILI);
	todayval = Math.round(todayval) * dayspan;
	ctx.strokeStyle = '#AAF';
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.moveTo(todayval, 0);
	ctx.lineTo(todayval, height);
	ctx.stroke();  
	//接続線の描画
	ctx.lineWidth = 3;
	for(var i=0; i<lineary.length; i++){
		//始点終点の座標計算
		var sy = taskary[lineary[i].start].brpos * 60 + 24;
		var sx = Math.round(taskary[lineary[i].start].dl.getTime()/ONEDAYMILI);
		var ex = Math.round(taskary[lineary[i].end].dl.getTime()/ONEDAYMILI);
		if(taskary[lineary[i].start].span){
			sx -= taskary[lineary[i].start].span;
			// ex -= taskary[lineary[i].end].span;
		} else {
			sx -= 1;
			// ex -= 1;
		}
		if(lineary[i].connection=='-'){
			//子タスクとの接続
			// console.log('sx:'+(sx - startdate + 1)+' ex:'+(ex - startdate + 1));
			ctx.strokeStyle = '#86CE86';
			ctx.beginPath();
			ctx.moveTo((sx - startdate + 1)*dayspan, sy + TASKSHIFTDOWN);
			ctx.lineTo((ex - startdate + 1)*dayspan, sy + TASKSHIFTDOWN);
			ctx.stroke(); 
		} else{
			//子ブランチとの接続
			ctx.strokeStyle = '#fa4';
			var ey = taskary[lineary[i].end].brpos * 60 + 24;
			// console.log('sx:'+(sx - startdate + 1) + ' sy:'+sy);
			// console.log('ex:'+(ex - startdate + 1) + ' ey:'+ey);
			ctx.beginPath();
			ctx.moveTo((sx - startdate + 1)*dayspan+dayspan/2, sy + TASKSHIFTDOWN);
			ctx.lineTo((sx - startdate + 1)*dayspan+dayspan/2, ey + TASKSHIFTDOWN);
			ctx.lineTo((ex - startdate + 1)*dayspan, ey + TASKSHIFTDOWN);
			ctx.stroke(); 
		}
	}
}

//タスクを探索する再起関数
function exploreTask(task, maxbrpos, taskary, lineary){
	//子タスクをたどり一時配列にpushする（昇順で入る）
	var curary = [];
	do{
		if(!task) continue;
		if(task.brpos != maxbrpos){
			task.brupdate = true;	//db更新のためにbrposが変更されたことを記録
			task.brpos = maxbrpos;	//同じブランチの子タスクのbrposを設定
		}
		curary.push(task._id);
		if(task.ctsk) {
			if(taskary[task.ctsk]){
				lineary.push({start:task._id, end:task.ctsk, connection:'-'}); 
				task = taskary[task.ctsk];
			}
		} else break;
	}while(task);
	//子タスクを降順で探索する
	for(var i=curary.length-1; i>=0; i--){
		//if(!task) continue;
		//マスターブランチのタスクの位置は常に0
		if(task.mbr) maxbrpos = 0;
		// console.log(curary[i]+':'+taskary[curary[i]].ti);
		//ブランチを探索し、maxbrposを更新する
		if(taskary[curary[i]].brch){
			// if(taskary[curary[i]].brch.length > 0) console.log(taskary[curary[i]].brch);
			for(var j=0; j<taskary[curary[i]].brch.length; j++){
				brid = taskary[curary[i]].brch[j];
				if(taskary[brid]){
					lineary.push({start: curary[i], end: brid, connection: 'L'}); 
					var result = exploreTask(taskary[brid], maxbrpos+1, taskary, lineary);
					if(result > maxbrpos) maxbrpos = result;
				}
			}
		}
	}
	// console.log('mb:' + maxbrpos);
	return maxbrpos;
}

// タイムラインの描画
function updateTimeline(){
  var viewmonth = Session.get('viewmonth');
  var dayspan = Session.get('dayspan');
  var timelinedays = Session.get('timelinedays');
  //キャンバスを取得
  var cvs = $('#cvs_timeline');
  var startday = 0; //7日前からタイムラインを開始する
  //サイズ設定
  var width = timelinedays*dayspan;// - HEADWIDTH;
  if(width>$('#listarea').width()*ZOOMREVERSE) width = $('#listarea').width()*ZOOMREVERSE;
  cvs.get(0).width = width - HEADWIDTH;
  cvs.get(0).height = 60;
  // $('nav').width(width);//+HEADWIDTH);
  //描画
  var ctx = cvs.get(0).getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, 60);
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1;
  ctx.font = '30px  Arial';
  ctx.fillStyle = '#aaa';
  //目盛りと日付を描画
  for(var i=0; i<=timelinedays; i++){
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
  ctx.moveTo(todayval, 30);
  ctx.lineTo(todayval, 60);
  ctx.stroke();  
  ctx.fillStyle = '#68f';
  ctx.font = '14px  Arial';
  ctx.fillText('today' + (today.getMonth()+1) + '/' + today.getDate(), todayval+2, 44);
}