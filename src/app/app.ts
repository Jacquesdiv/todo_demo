import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SplitBill } from './split-bill/split-bill';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SplitBill],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
