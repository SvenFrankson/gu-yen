import { Camera, PostProcess, Effect, FxaaPostProcess } from "@babylonjs/core";

export class OutlinePostProcess {
    
    public static AddOutlinePostProcess(camera: Camera): PostProcess {
        let scene = camera.getScene();
        let engine = scene.getEngine();

        Effect.ShadersStore["EdgeFragmentShader"] = `
			#ifdef GL_ES
			precision highp float;
			#endif
			varying vec2 vUV;
			uniform sampler2D textureSampler;
			uniform sampler2D depthSampler;
			uniform float 		width;
			uniform float 		height;
			void make_kernel_color(inout vec4 n[9], sampler2D tex, vec2 coord)
			{
				float w = 1.0 / width;
				float h = 1.0 / height;
				n[0] = texture2D(tex, coord + vec2( -w, -h));
				n[1] = texture2D(tex, coord + vec2(0.0, -h));
				n[2] = texture2D(tex, coord + vec2(  w, -h));
				n[3] = texture2D(tex, coord + vec2( -w, 0.0));
				n[4] = texture2D(tex, coord);
				n[5] = texture2D(tex, coord + vec2(  w, 0.0));
				n[6] = texture2D(tex, coord + vec2( -w, h));
				n[7] = texture2D(tex, coord + vec2(0.0, h));
				n[8] = texture2D(tex, coord + vec2(  w, h));
			}
			
			void make_kernel_depth(inout float n[9], sampler2D tex, vec2 coord)
			{
				float w = 1.0 / width;
				float h = 1.0 / height;
				n[0] = texture2D(tex, coord + vec2( -w, -h)).r;
				n[1] = texture2D(tex, coord + vec2(0.0, -h)).r;
				n[2] = texture2D(tex, coord + vec2(  w, -h)).r;
				n[3] = texture2D(tex, coord + vec2( -w, 0.0)).r;
				n[4] = texture2D(tex, coord).r;
				n[5] = texture2D(tex, coord + vec2(  w, 0.0)).r;
				n[6] = texture2D(tex, coord + vec2( -w, h)).r;
				n[7] = texture2D(tex, coord + vec2(0.0, h)).r;
				n[8] = texture2D(tex, coord + vec2(  w, h)).r;
			}

			void main(void) 
			{
				vec4 d = texture2D(depthSampler, vUV);
				float depthFactor = min(d.r * 5., 1.);
				
				float nD[9];
				make_kernel_depth( nD, depthSampler, vUV );
				float sobel_depth_edge_h = nD[2] + (2.0*nD[5]) + nD[8] - (nD[0] + (2.0*nD[3]) + nD[6]);
				float sobel_depth_edge_v = nD[0] + (2.0*nD[1]) + nD[2] - (nD[6] + (2.0*nD[7]) + nD[8]);
				float sobel_depth = sqrt((sobel_depth_edge_h * sobel_depth_edge_h) + (sobel_depth_edge_v * sobel_depth_edge_v));

				vec4 n[9];
				make_kernel_color( n, textureSampler, vUV );
				vec4 sobel_edge_h = n[2] + (2.0*n[5]) + n[8] - (n[0] + (2.0*n[3]) + n[6]);
				vec4 sobel_edge_v = n[0] + (2.0*n[1]) + n[2] - (n[6] + (2.0*n[7]) + n[8]);
				vec4 sobel = sqrt((sobel_edge_h * sobel_edge_h) + (sobel_edge_v * sobel_edge_v));
				
				gl_FragColor = n[4];
				if (sobel_depth > 0.0005 + 0.05 * depthFactor) {
					gl_FragColor = vec4(0., 0., 0., 1.) * (1. - depthFactor) + n[4] * depthFactor;
				}
				else {
					int r = int(round(gl_FragColor.r * 256.));
					if (r % 2 == 1) {
						if (max(sobel.r, max(sobel.g, sobel.b)) > 1. + 0.25 * depthFactor) {
							gl_FragColor = vec4(0., 0., 0., 1.) * (1. - depthFactor) + n[4] * depthFactor;
						}
					}
				}
			}
        `;
        
		let depthMap = scene.enableDepthRenderer(camera).getDepthMap();
		
		let postProcess = new PostProcess("Edge", "Edge", ["width", "height"], ["depthSampler"], 1, camera);
		postProcess.onApply = (effect) => {
			effect.setTexture("depthSampler", depthMap);
			effect.setFloat("width", engine.getRenderWidth());
			effect.setFloat("height", engine.getRenderHeight());
		};
    	new FxaaPostProcess("fxaa", 1, camera);
		return postProcess;
    }
}