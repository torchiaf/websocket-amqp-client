declare var require: any;

import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const amqLib = require('node_modules/@cloudamqp/amqp-client/dist/amqp-websocket-client.mjs');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'amqp-test';
  amqp = null;
  textarea: any;
  input: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {

    this.http.get('/monitor-operator/auth').subscribe(async (params: any) => {

      const { rabbitmqPath, rabbitmqUsername, rabbitmqPassword } = params;

      const amqp = new amqLib.AMQPWebSocketClient(
        `ws://localhost/${ rabbitmqPath }`,
        "/",
        rabbitmqUsername,
        rabbitmqPassword
      );

      try {

        const conn = await amqp.connect()
        const ch = await conn.channel()

        await ch.exchangeDeclare(
          "logs_topic", // name
          "topic",      // type
        )

        const q = await ch.queueDeclare();

        await ch.queueBind(q.Name, "logs_topic", "pippo");

        ch.basicConsume(q.name, {noAck: true}, (msg: any) => {
          console.log(msg)
        })

        // const consumer = await q.subscribe({noAck: true}, (msg: any) => {
        //   console.log(msg)
        // })
      } catch (err) {
        console.error("Error", err);
      }
    });
  }
}
