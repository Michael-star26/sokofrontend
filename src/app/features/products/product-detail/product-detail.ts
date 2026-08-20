import { Component, inject, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ProductService } from '../../../core/services/product';
import { Auth } from '../../../core/services/auth';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    RouterLink,
    NzButtonModule,
    NzSpinModule,
    NzTagModule,
    NzPopconfirmModule
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
  encapsulation: ViewEncapsulation.None
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private authService = inject(Auth);
  private message = inject(NzMessageService);

  isAdmin = toSignal(this.authService.isAdmin$, { initialValue: false });
  product = toSignal(
    this.route.paramMap.pipe(
      switchMap(params => {
        const id = Number(params.get('id'));
        return this.productService.getProductById(id);
      })
    )
  );

  deleteProduct(id: number): void {
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.message.success('Product removed from the forest');
        this.router.navigate(['/products']);
      },
      error: () => this.message.error('Failed to delete product')
    });
  }
}
