//タイムライン更新用定数
var HEADWIDTH = 240+18;
var ONEDAYMILI = 24*60*60*1000;
var TIMELINEDAYS = 29;


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
		Meteor.call('updateTaskBrpos', i, taskary[i].brpos);//ついでに更新
		if(maxbrpos < taskary[i].brpos) maxbrpos = taskary[i].brpos;
	}
	// console.log(maxbrpos);
	//プロジェクトの高さを拡張
	var area = $('#'+projid);
	area.height((maxbrpos+1) * 60);
	//サイズ設定
	var dayspan = Session.get('dayspan');
	var width = (TIMELINEDAYS)*dayspan;
	if(width>document.documentElement.clientWidth) width = document.documentElement.clientWidth;
	area.width(width)// + HEADWIDTH);
	var cvs = area.find('.project-cvs');
	cvs.get(0).height = (maxbrpos+1) * 60;
	cvs.get(0).width = width;// + HEADWIDTH;
	var ctx = cvs.get(0).getContext('2d');
	//土日をグレーアウト
	ctx.fillStyle = '#eee';
	for(var i=0; i<=TIMELINEDAYS; i++){
		if(i%7>4){
			ctx.fillRect(i*dayspan + HEADWIDTH, 0, dayspan, (maxbrpos+1) * 60);
		}
	 }
	//接続線の描画
	// console.log(lineary);
	ctx.lineWidth = 1;
	var viewmonth = Session.get('viewmonth');
	var dayspan = Session.get('dayspan');
	var startdate = Math.round(viewmonth.getTime() / ONEDAYMILI);
	for(var i=0; i<lineary.length; i++){
		//始点終点の座標計算
		var sy = taskary[lineary[i].start].brpos * 60 + 24;
		var sx = Math.round(taskary[lineary[i].start].dl.getTime()/ONEDAYMILI);
		var ex = Math.round(taskary[lineary[i].end].dl.getTime()/ONEDAYMILI);
		if(lineary[i].connection=='-'){
			//子タスクとの接続
			// console.log('sx:'+(sx - startdate + 1)+' ex:'+(ex - startdate + 1));
			ctx.strokeStyle = '#4a4';
			ctx.beginPath();
			ctx.moveTo((sx - startdate + 1)*dayspan + HEADWIDTH, sy);
			ctx.lineTo((ex - startdate + 1)*dayspan + HEADWIDTH, sy);
			ctx.stroke(); 
		} else{
			//子ブランチとの接続
			ctx.strokeStyle = '#fa4';
			var ey = taskary[lineary[i].end].brpos * 60 + 24;
			// console.log('sx:'+(sx - startdate + 1) + ' sy:'+sy);
			// console.log('ex:'+(ex - startdate + 1) + ' ey:'+ey);
			ctx.beginPath();
			ctx.moveTo((sx - startdate + 1)*dayspan + HEADWIDTH-30, sy);
			ctx.lineTo((sx - startdate + 1)*dayspan + HEADWIDTH-30, ey);
			ctx.lineTo((ex - startdate + 1)*dayspan + HEADWIDTH-30, ey);
			ctx.stroke(); 
		}
	}
}

//タスクを探索する再起関数
function exploreTask(task, maxbrpos, taskary, lineary){
	//マスターブランチのタスクの位置は常に0
	//子タスクをたどり一時配列にpushする（昇順で入る）
	var curary = [];
	do{
		if(!task) continue;
		task.brpos = maxbrpos;	//同じブランチの子タスクのbrposを設定
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