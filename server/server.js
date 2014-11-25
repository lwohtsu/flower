//コレクション作成

Projects = new Mongo.Collection("projects");
Tasks = new Mongo.Collection("tasks");
//バーチャルズは架空のユーザー。プロジェクト管理に参加しないユーザーやクライアントとなります。
Virtuals = new Mongo.Collection('virtuals');

Meteor.publish("virtuals", function () {
	return Virtuals.find({});
});

Meteor.methods({

	//新規プロジェクトを追加
	addNewProject: function(){
		//セキュリティチェック
		if (! Meteor.userId()) throw new Meteor.Error("not-authorized");

		//新規プロジェクトを登録　名前はダミー、ユーザーは配列でカレントユーザーを登録
		var newprojid = Projects.insert({
			nm: 'new project name',	//プロジェクト名
			urs:[Meteor.userId()]	//ユーザーリスト
		});
		//新規タスク挿入
		Tasks.insert({
			prid: newprojid,		//親プロジェクト
			mbr: true,				//マスターブランチかどうか
			str: true,				//スタートタスクかどうか
			ti: 'new task title',	//タスクタイトル
			us: Meteor.userId(),	//担当ユーザー
			dl: new Date(),			//デッドライン
			//ctsk 					//子タスク
			brch: []				//ブランチ（初期値は空）
		});
	}
});