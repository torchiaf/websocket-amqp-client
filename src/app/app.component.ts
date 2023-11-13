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

  rules: any;
  pods: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {

    this.http.get('http://localhost/api/v1/rules').subscribe((rules: any) => {
      this.rules = rules.Name;
    });

    this.http.get('http://localhost/api/v1/pods').subscribe((pods: any) => {
      this.pods = pods.items.map((i: any) => i.metadata.name);
    });

    this.http.get('http://localhost/api/v1/auth').subscribe(async (params: any) => {

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
          const nodes = JSON.parse(msg) as { items: any[], metadata: any };

          this.msgs = [
            ...this.msgs,
            {
              routingKey: v.routingKey,
              exchange: v.exchange,
              msg: `[ ${nodes.items.reduce((acc, x) => ([
                ...acc,
                x.metadata.name
              ]), [])} ]`,
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
