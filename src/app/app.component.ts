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

  wsConnected = false;
  restApiConnected = false;
  msgs: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {

    this.http.get('http://localhost/api/auth').subscribe(async (params: any) => {

      this.restApiConnected = true;

      const {
        rabbitmqPath,
        rabbitmqUsername,
        rabbitmqPassword,
        dataCollectorRoutingKey
      } = params;

      const amqp = new amqLib.AMQPWebSocketClient(
        `ws://localhost/${ rabbitmqPath }`,
        "/",
        rabbitmqUsername,
        rabbitmqPassword
      );

      try {

        const conn = await amqp.connect()
        const ch = await conn.channel()

        this.wsConnected = true;

        await ch.exchangeDeclare(
          "logs_topic", // name
          "topic",      // type
        )

        const q = await ch.queueDeclare();

        await ch.queueBind(q.Name, "logs_topic", dataCollectorRoutingKey);

        ch.basicConsume(q.name, {noAck: true}, (v: any) => {
          const msg = new TextDecoder().decode(v.body);
          console.log(v);
          this.msgs = [
            ...this.msgs,
            {
              routingKey: v.routingKey,
              exchange: v.exchange,
              msg
            }
          ];
        })

        // const consumer = await q.subscribe({noAck: true}, (msg: any) => {
        //   console.log(msg)
        // })
      } catch (err) {
        this.wsConnected = false;
        console.error("Error", err);
      }
    });
  }
}
