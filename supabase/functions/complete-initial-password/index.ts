import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const ORIGIN = "https://staff.hopeaid.ngo";
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: {...cors, "Content-Type":"application/json", "Cache-Control":"no-store" } });
}
Deno.serve(async (req: Request) => {
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST") return respond(405,{error:"Method not allowed"});
 const jwt=/^Bearer ([^\s]+)$/.exec(req.headers.get("authorization")||"")?.[1];
 if(!jwt) return respond(401,{error:"Sign in required"});
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key) return respond(503,{error:"Staff administration unavailable"});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try {
   const {data:auth,error:authError}=await admin.auth.getUser(jwt);
   if(authError||!auth.user) return respond(401,{error:"Session expired"});
   const {data:profile,error:readError}=await admin.from("staff_profiles")
     .select("is_active,must_change_password").eq("id",auth.user.id).maybeSingle();
   if(readError||!profile?.is_active||!profile.must_change_password)
     return respond(403,{error:"Password change is not required for this account"});
   const body=await req.json();
   const next=String(body?.new_password||"");
   if(next.length<12||next.length>128||!/[a-z]/.test(next)||!/[A-Z]/.test(next)||!/[0-9]/.test(next))
     return respond(400,{error:"Use 12+ characters including upper/lowercase letters and a number"});
   const {error:passwordError}=await admin.auth.admin.updateUserById(auth.user.id,{password:next});
   if(passwordError) return respond(400,{error:passwordError.message});
   const {error:saveError}=await admin.from("staff_profiles")
     .update({must_change_password:false}).eq("id",auth.user.id).eq("must_change_password",true);
   if(saveError) return respond(500,{error:"Password updated; contact an administrator to complete activation"});
   return respond(200,{ok:true});
 }catch(e) {
   console.error("Staff first login setup error",e instanceof Error?e.message:"unknown");
   return respond(500,{error:"Unable to complete password setup"});
 }
});