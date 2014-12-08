//コレクション作成

Projects = new Mongo.Collection("projects");
Tasks = new Mongo.Collection("tasks");
//バーチャルズは架空のユーザー。プロジェクト管理に参加しないユーザーやクライアントとなります。
Virtuals = new Mongo.Collection('virtuals');

Meteor.publish("virtuals", function () {
	return Virtuals.find({});
});

Meteor.publish("projects", function(){
	//現在のユーザーが参加しているプロジェクトのみパブリッシュする
	return Projects.find({'urs': this.userId });
});
Meteor.publish("tasks", function(){
	return Tasks.find({});
});

Meteor.methods({

	//新規プロジェクトを追加
	addNewProject: function(){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");

		//新規プロジェクトを登録　名前はダミー、ユーザーは配列でカレントユーザーを登録
		var newprojid = Projects.insert({
			nm: 'new project name',	//プロジェクト名
			urs:[Meteor.userId()],	//ユーザーリスト
			create: new Date()
		});
		//日付
		var dldate = new Date();
		dldate.setHours(9);
		dldate.setMinutes(0);
		dldate.setSeconds(0);
		//新規タスク挿入
		Tasks.insert({
			prid: newprojid,		//親プロジェクト
			mbr: true,				//マスターブランチかどうか
			str: true,				//スタートタスクかどうか
			ti: 'startup',	//タスクタイトル
			us: Meteor.userId(),	//担当ユーザー
			dl: dldate,			//デッドライン
			//ctsk 					//子タスク
			brch: [],				//ブランチ（初期値は空）
			create: new Date(),
		});
	},
	//プロジェクト削除
	deleteProject: function(projectid){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Projects.remove({'_id': projectid});
		Tasks.remove({'prid': projectid});
	},
	//新規タスクを追加
	addNewTask: function(projectid, parentid, ismbr, parentdl){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		//日付（初期値は親タスクの2日後）
		var dldate = new Date();
		dldate.setTime(parentdl.getTime() + 24*60*60*1000);
		dldate.setHours(9);
		dldate.setMinutes(0);
		dldate.setSeconds(0);
		var newtaskid = Tasks.insert({
			prid: projectid,		//親プロジェクト
			mbr: ismbr,				//マスターブランチかどうか
			ti: 'new task',			//タスクタイトル
			us: Meteor.userId(),	//担当ユーザー
			dl: dldate,				//デッドライン
			//ctsk 					//子タスク
			brch: [],				//ブランチ（初期値は空）
			create: new Date()
		});
		//親タスクを取得
		var parent = Tasks.findOne({'_id': parentid});
		//親タスクと連結
		if(parent.ctsk){
			//すでに子タスクを持っている場合はその間に入るようにする
			Tasks.update({'_id': newtaskid}, {$set: {ctsk: parent.ctsk}});
		}
		Tasks.update({'_id': parentid}, {$set: {ctsk: newtaskid}});
		//親がブランチなら引き継ぐ
		if(parent.brpos){
			Tasks.update({'_id': newtaskid}, {$set: {brpos: parent.brpos}});
		}
		return newtaskid;
	},
	//ブランチを作成して新規タスクを追加
	addNewTaskWithBranch: function(projectid, parentid, parentdl, brpos){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		//日付（初期値は親タスクの2日後）
		var dldate = new Date();
		dldate.setTime(parentdl.getTime() + 24*60*60*1000);
		dldate.setHours(9);
		dldate.setMinutes(0);
		dldate.setSeconds(0);
		var newtaskid = Tasks.insert({
			prid: projectid,		//親プロジェクト
			ti: 'new branch',		//タスクタイトル
			us: Meteor.userId(),	//担当ユーザー
			dl: dldate,			//デッドライン
			//ctsk 					//子タスク
			brch: [],				//ブランチ（初期値は空）
			create: new Date(),
			brpos: brpos
		});
		//親タスクと連結
		var parent = Tasks.findOne({'_id': parentid});
		Tasks.update({'_id': parentid}, {$push: {brch: newtaskid}});
		return newtaskid;
	},
	//タスク削除
	deleteTask: function(taskid){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		var cur = Tasks.findOne({'_id': taskid});
		if(cur.str) return;	//スタートタスクは削除できない
		if(cur.ctsk){
			//削除しようとしているタスクが子を持っている場合、それを親に引き継ぐ
			var parent = Tasks.findOne({'ctsk': cur._id});
			if(parent){
				Tasks.update({'_id': parent._id}, {$set: {ctsk: cur.ctsk}});
			}
		} else {
			//子タスクがない場合、親から連結を消す
			var parent = Tasks.findOne({'ctsk': cur._id});
			if(parent){
				Tasks.update({'_id': parent._id}, {$unset: {ctsk: ''}});
			}
		}
		//ブランチの先頭でないかも調べる
		parent = Tasks.findOne({'brch': cur._id});
		if(parent){
			var oldary = parent.brch;
			oldary.some(function(v, i){
				if (v==cur._id) oldary.splice(i,1);    
			});
			Tasks.update({'_id': parent._id}, {$set: {'brch':oldary}});
			if(cur.ctsk){
				Tasks.update({'_id': parent._id}, {$push: {'brch':cur.ctsk}});
			}
		}
		Tasks.remove({'_id': taskid});
	},
	//更新用メソッド
	updateProjectName: function(prid, name){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Projects.update({_id: prid}, {$set: {nm: name}});
	},
	updateTaskTitle: function(tid, title){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Tasks.update({_id: tid}, {$set: {ti: title}});
	},
	updateTaskUser: function(tid, user){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Tasks.update({_id: tid}, {$set: {us: user}});
	},
	updateTaskDeadline: function(tid, deadline){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		var task = Tasks.findOne({_id: tid});
		//日付の差を求める
		var shift = deadline.getTime() - task.dl.getTime();
		//TODO：ここから先は変更が必要
		updateAllTaskDeadline(task, shift);
	},
	updateTaskBrpos: function(tid, brpos){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");
		Tasks.update({_id: tid}, {$set: {brpos: brpos}});
	}
});

//すべての子とブランチの締め切り日をずらす
function updateAllTaskDeadline(task, shift){
	//このタスクの日付のアップデート
	task.dl.setTime(task.dl.getTime() + shift);
	Tasks.update({_id: task._id}, {$set: {dl: task.dl}});
	//子タスクを辿る
	if(task.ctsk){
		var ctsk = Tasks.findOne({_id: task.ctsk});
		if(ctsk){
			updateAllTaskDeadline(ctsk, shift);
		}
	}
	//ブランチを辿る
	if(task.brch){
		for(var i=0; i<task.brch.length; i++){
			var brtask = Tasks.findOne({_id: task.brch[i]});
			if(brtask){
				updateAllTaskDeadline(brtask, shift);
			}
		}
	}
}