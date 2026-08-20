import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Render dynamic product detail pages on-demand at runtime
  {
    path: 'products/:id',
    renderMode: RenderMode.Server
  },
  // Render protected admin and auth-dependent views on the server
  {
    path: 'admin/**',
    renderMode: RenderMode.Server
  },
  {
    path: 'products/add',
    renderMode: RenderMode.Server
  },
  // Prerender all static public routes (Login, Register, Product List)
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
