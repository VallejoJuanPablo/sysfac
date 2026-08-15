import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'arsCurrency', standalone: true })
export class CurrencyPipe implements PipeTransform {
  transform(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '$0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0';
    return '$' + Math.round(num).toLocaleString('es-AR');
  }
}
