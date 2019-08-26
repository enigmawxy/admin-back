/**
 * Created by hao.cheng on 2017/4/16.
 */

import React from 'react';
import { Alert, Table, Input, InputNumber, Popconfirm, Form, Button } from 'antd';

var Parse = require('parse');
Parse.initialize("appid1", "mk1");
Parse.serverURL = 'http://127.0.0.1:1337/parse';

const FormItem = Form.Item;
const EditableContext = React.createContext();

const EditableRow = ({ form, index, ...props }) => (
	<EditableContext.Provider value={form}>
		<tr {...props} />
	</EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);

class EditableCell extends React.Component {
	getInput = () => {
		if (this.props.inputType === 'number') {
			return <InputNumber />;
		}
		return <Input />;
	};
	render() {
		const {
			editing,
			dataIndex,
			title,
			inputType,
			record,
			index,
			...restProps
		} = this.props;
		return (
			<EditableContext.Consumer>
				{(form) => {
					const { getFieldDecorator } = form;
					return (
						<td {...restProps}>
							{editing ? (
								<FormItem style={{ margin: 0 }}>
									{getFieldDecorator(dataIndex, {
										rules: [{
											required: true,
											message: `Please Input ${title}!`,
										}],
										initialValue: record[dataIndex],
									})(this.getInput())}
								</FormItem>
							) : restProps.children}
						</td>
					);
				}}
			</EditableContext.Consumer>
		);
	}
}

export default class EditableTable extends React.Component {
	constructor(props) {
		super(props);
		// this.generateMockData = this.generateMockData().bind(this);
		this.state = { editingKey: '' , haveData: true};
		this.columns = [
			{
				title: '姓名',
				dataIndex: 'name',
				width: '25%',
				editable: true,
			},
			{
				title: '年龄',
				dataIndex: 'age',
				width: '15%',
				editable: true,
			},
			{
				title: '地址',
				dataIndex: 'address',
				width: '40%',
				editable: true,
			},
			{
				title: '操作',
				dataIndex: 'operation',
				render: (text, record) => {
					const editable = this.isEditing(record);
					return (
						<div>
							{editable ? (
								<span>
									<EditableContext.Consumer>
										{form => (
											<Button
												onClick={() => this.save(form, record.key)}
												style={{ marginRight: 8 }}
											>
												Save
                      						</Button>
										)}
									</EditableContext.Consumer>
									<Popconfirm
										title="Sure to cancel?"
										onConfirm={() => this.cancel(record.key)}
									>
										<Button>Cancel</Button>
									</Popconfirm>
								</span>
							) : (
									<Button onClick={() => this.edit(record.key)}>Edit</Button>
								)}
						</div>
					);
				},
			},
		];
	}

	componentWillMount() {
		this.generateMockData();
	}

	async generateMockData() {
		var theData = [];
		const BasicInfo = Parse.Object.extend("BasicInfo");
		const query = new Parse.Query(BasicInfo);
		query.limit(5000);
		console.log('1');

		console.time();
		let isData = true;

		var results = await query.find();
		// 	query.find().then(function(res) {
		// 	console.log(res);
		// 	results = res;
		// }, function(error) {
		// 	console.log('find: ' + error);
		// 	isData = false;
		// });
		console.timeEnd();
		console.log(results);
		this.setState({'haveData':isData});

		if(!isData) return;

		console.log('2');
		if (results.length === 0) {
			console.log('31');
			for (let i = 0; i < 100; i++) {
				let item = {
					key: i.toString(),
					name: `Thomas ${i}`,
					age: (18 + i),
					address: `London Park no. ${i}`,
				};

				const basicInfo = new BasicInfo();
				basicInfo.save(item)
					.then((basicInfo) => {
						console.log('New object created with objectId: ' + basicInfo.id + "|"+ item.key);
						item.objectId = basicInfo.id;
					}, (error) => {
						console.log('Failed to create new object, with error code: ' + error.message);
					});
			}
		} else {
			console.log('32');
			for (let i = 0; i < results.length; i++) {
				theData.push({
					objectId: results[i].id,
					key: results[i].get('key'),
					name: results[i].get('name'),
					age: results[i].get('age'),
					address: results[i].get('address'),
				});
			}
		}

		console.log('4');
		console.log(theData);
		this.setState({data: theData });
	};

	isEditing = (record) => {
		return record.key === this.state.editingKey;
	};
	edit(key) {
		this.setState({ editingKey: key });
	}
	save(form, key) {
		form.validateFields((error, row) => {
			if (error) {
				return;
			}
			const newData = [...this.state.data];
			const index = newData.findIndex(item => key === item.key);
			if (index > -1) {
				const item = newData[index];
				console.log(item);
				console.log(row);
				newData.splice(index, 1, {
					...item,
					...row,
				});
				this.setState({ data: newData, editingKey: '' });

				const BasicInfo = Parse.Object.extend("BasicInfo");
				const query = new Parse.Query(BasicInfo);

				query.get(item.objectId).then((item1) => {
					console.log(item1);
					item1.set('name', row.name);
					item1.set('age', row.age);
					item1.set('address', row.address);
					item1.save();
				}, (error)=>{
					alert('error:' + error.message);
				});

			} else {
				// newData.push(data);
				this.setState({ data: newData, editingKey: '' });
			}
		});
	}
	cancel = () => {
		this.setState({ editingKey: '' });
	};
	render() {
		const isData = this.state.haveData;

		const components = {
			body: {
				row: EditableFormRow,
				cell: EditableCell,
			},
		};

		const columns = this.columns.map((col) => {
			if (!col.editable) {
				return col;
			}
			return {
				...col,
				onCell: record => ({
					record,
					inputType: col.dataIndex === 'age' ? 'number' : 'text',
					dataIndex: col.dataIndex,
					title: col.title,
					editing: this.isEditing(record),
				}),
			};
		});

		return (
			<div>
			{ isData?
				<Table
					components={components}
					bordered
					dataSource={this.state.data}
					columns={columns}
					rowClassName="editable-row"
				/>:

				<Alert
				message="Error"
				description="网络不给力呀，请检查网络，后再试！"
				type="error" showIcon
				/>
			}
			</div>
		);
	}
}
