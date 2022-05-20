<script lang="ts">
	// import { waitForDebugger } from 'inspector';
	// import { tick } from 'svelte';
	import { onMount } from 'svelte';
	// import { beforeUpdate, afterUpdate } from 'svelte';
	import Modal from './Modal.svelte';
	import Card from "./Card.svelte";
	import Image from "./Image.svelte";

	let displayname: string = "";
	let isLoggedIn: boolean = false;
	let AliveCheck;
	let bShouldDisplay: boolean = false;
	let userProjects = [];
	let nUserProjects = 0;


	let selectedEntityName = "";
	let selectedMachineFingerprint = "";
	let selectedProjectUUID = "";

	

	let orgUUID: string = "";
	let orgName: string = "";
	let hasOrgUUID: boolean = false;
	let userOrgs = [];
	let nOrgs = 0;
	let orgMachines = [];
	let nOrgMachines = 0;
	let orgProjects = [];
	let nOrgProjects = 0;
	

	const E_PAGETYPE_Organisation: number = 0;
	const E_PAGETYPE_User: number = 1;
	const E_PAGETYPE_Project: number = 2;
	const E_PAGETYPE_Machine: number = 3;
	const E_PAGETYPE_Default: number = 4;
	const E_PAGETYPE_OrganisationEdit: number = 5;
	const E_PAGETYPE_OrganisationEditMachines: number = 6;
	const E_PAGETYPE_OrganisationEditProjects: number = 7;
	const E_PAGETYPE_OrganisationEditUsers: number = 8;
	const E_PAGETYPE_OrganisationCreate: number = 9;
	
	let PageType: number = E_PAGETYPE_Default;

	const E_MODALSTATE_Default: number = 0;
	const E_MODALSTATE_CreateOrg: number = 1;
	const E_MODALSTATE_CreateProject: number = 2;
	const E_MODALSTATE_CreateUser: number = 3;
	const E_MODALSTATE_CreateMachine: number = 4;
	const E_MODALSTATE_ShowMachine: number = 5;
	const E_MODALSTATE_ShowProject: number = 6;

	let ModalState: number = E_MODALSTATE_Default;

	let entryName = "";


	async function CleanState()
	{
		listedTags = [];
		selectedEntityName = "";
		listedHash = "";
		listedShortHash = "";
		listedModalX = 0;
		listedModalY = 0;
		entryName = "";
		showModal = false;
	}

	async function HandleImageDesummon(event) 
	{
		CleanState();
	}


	async function DeleteOrgMachine()
	{
		//CREATE!
		try
		{
			let fetchable = await fetch(`/api/machines`,
			{
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
				body: JSON.stringify({
					"machineuuid": selectedMachineFingerprint,
					"org": orgUUID
				})
			});

			if(fetchable.status == 200)
			{
				await LoadMachinesForOrg();
				showModal = false;				
			}
		}
		catch (Exception)
		{
			throw Exception;
		}
		finally
		{

		}
	}

	async function GetUserInfo()
	{
		try
		{
			let fetched = await fetch(`/api/user`);
			if (fetched.ok)
			{
				let userinfo: JSON = await fetched.json();
				displayname = userinfo['displayname'];

				// Are we logged in?
				if(!isLoggedIn && !AliveCheck)
				{
					AliveCheck = setInterval(GetUserInfo, 2 * 60 * 1000);
				}
				isLoggedIn = true;
			}
			else
			{
				// Okay...
				isLoggedIn = false;
				clearInterval(AliveCheck);
				console.log("MOVE")
			}
		}
		catch (Exception)
		{
			if (isLoggedIn)
			{
				// Okay... Something has *actually* gone wrong
				console.log("Fetching Mirage user has failed, but state says session is live");
				isLoggedIn = false;
				clearInterval(AliveCheck);
			}
		}
		finally
		{
			
		}
	}

	async function LoadMacPerms(uuid: string)
	{
		// Go ahead and check we're even in the correct state
		// if (!(PageState === EState_BoardView || override))
		// {
		// 	return;
		// }

		try
		{
			let fetchable = await fetch(`/api/permissions`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
				body: JSON.stringify(
					{
						"machine": 0x0,
						"project": 0x0
					}
				)
			});

			let blob: JSON = await fetchable.json();
			
			//console.log(blob);
			if("machines" in blob)
			{
				orgMachines = blob["machines"];
				nOrgMachines = orgMachines.length;
			}
			console.log(orgMachines);
		}
		catch (Exception)
		{
			throw Exception;
		}
		finally
		{

		}
	}

	async function LoadMachinesForOrg(override: boolean = false)
	{
		// Go ahead and check we're even in the correct state
		// if (!(PageState === EState_BoardView || override))
		// {
		// 	return;
		// }

		try
		{
			if(hasOrgUUID)
			{
				let fetchable = await fetch(`/api/machines`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=utf-8'
					},
					body: JSON.stringify(
						{
							"org": orgUUID
						}
					)
				});

				let blob: JSON = await fetchable.json();
				
				//console.log(blob);
				if("machines" in blob)
				{
					orgMachines = blob["machines"];
					nOrgMachines = orgMachines.length;
				}
				console.log(orgMachines);
			}
			else
			{
				console.log("Something went wrong! Org ID is not set");
			}
		}
		catch (Exception)
		{
			throw Exception;
		}
		finally
		{

		}
	}

	async function LoadProjectsForOrg(override: boolean = false)
	{
		// Go ahead and check we're even in the correct state
		// if (!(PageState === EState_BoardView || override))
		// {
		// 	return;
		// }

		try
		{
			if(hasOrgUUID)
			{
				let fetchable = await fetch(`/api/projects`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=utf-8'
					},
					body: JSON.stringify(
						{
							"org": orgUUID
						}
					)
				});

				let blob: JSON = await fetchable.json();
				
				//console.log(blob);
				if("projects" in blob)
				{
					orgProjects = blob["projects"];
					nOrgProjects = orgProjects.length;
				}
			}
			else
			{
				console.log("Something went wrong! Org ID is not set");
			}
		}
		catch (Exception)
		{
			throw Exception;
		}
		finally
		{

		}
	}


	async function CreateHandler()
	{
		//CREATE!!
		switch(ModalState)
		{
			case E_MODALSTATE_CreateMachine:
				CreateMachineHandler();
				break;
			default:
				console.log("NANI! We've broken something?")
				break;
		}

		CleanState();
	}

	async function CreateMachineHandler()
	{
		//CREATE!
		console.log(entryName);
		try
		{
			let fetchable = await fetch(`/api/machines`,
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
				body: JSON.stringify({
					"machinename": entryName,
					"org": orgUUID
				})
			});

			if(fetchable.status == 200)
			{
				await LoadMachinesForOrg();
				showModal = false;				
			}
		}
		catch (Exception)
		{
			throw Exception;
		}
		finally
		{

		}
	}

	async function LoadOrgs(override: boolean = false)
	{
		// Go ahead and check we're even in the correct state
		// if (!(PageState === EState_BoardView || override))
		// {
		// 	return;
		// }

		try
		{
			let fetchable = await fetch(`/api/orgs`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
				body: null
			});

			if(fetchable.status == 200)
			{
				let blob: JSON = await fetchable.json();
				
				if ("orgs" in blob)
				{
					userOrgs = blob["orgs"];
					nOrgs = userOrgs.length;
				}		
			}
			else
			{
				console.log("Fetch Error");
			}
		}
		catch (Exception)
		{
			throw Exception;
		}
		finally
		{

		}
	}



	async function CardRedirector(event)
	{
		try
		{
			if (event.detail.type === E_PAGETYPE_OrganisationEdit)
			{
				SwitchToOrgEdit(event);
			}
		}
		catch (Exception)
		{
			console.log(Exception);
		}
	}

	async function SwitchToOrgX(event, PageTypeSet: number)
	{
		try
		{
			orgUUID = event.detail.uuid;
			SwitchPageActual(PageTypeSet);
		}
		catch (Exception)
		{
			console.log("Failed to summon image panel");
			showModal = false;
			console.log(Exception);
		}
	}

	async function SwitchToOrgMachines(event)
	{
		await LoadMachinesForOrg();
		SwitchToOrgX(event, E_PAGETYPE_OrganisationEditMachines);
	}

	async function SwitchToOrgUsers(event)
	{
		SwitchToOrgX(event, E_PAGETYPE_OrganisationEditUsers);
	}

	async function SwitchToOrgProjects(event)
	{
		await LoadProjectsForOrg();
		SwitchToOrgX(event, E_PAGETYPE_OrganisationEditProjects);
	}




	//SwitchToOrgUsers

	async function SpawnCreateModal(event) 
	{
		// Do we need this?
		// We can check later
		ModalState = event.detail.type;
		switch(event.detail.type)
		{
			case E_MODALSTATE_CreateOrg:
				break;
			case E_MODALSTATE_ShowMachine:
				selectedEntityName = event.detail.name;
				selectedMachineFingerprint = event.detail.uuid;
				break;
			case E_MODALSTATE_CreateMachine:
				break;
			case E_MODALSTATE_CreateProject:
				break;
			case E_MODALSTATE_ShowProject:
				selectedEntityName = event.detail.name;
				selectedProjectUUID = event.detail.uuid;
				break;
			default:
				console.log("BAD CALL");
				break;
		}

		showModal = true;
		listedModalX = event.detail.x;// - (innerHeight / 2) ;
		listedModalY = event.detail.y;// - (innerHeight / 2);
	}

	async function SwitchToOrgEdit(event) 
	{
		try
		{
			orgName = event.detail.name;
			orgUUID = event.detail.uuid;
			hasOrgUUID = true;

			// TODO: Pull this org's perms for better usability
			// Right now, we can see actions we can't perform

			SwitchPageActual(E_PAGETYPE_OrganisationEdit);
		}
		catch (Exception)
		{

		}
	}

	async function SwitchPage(event)
	{
		SwitchPageActual(event.detail.type);
	}

	async function SwitchPageActual(NewPageState)
	{
		try
		{
			switch(NewPageState)
			{
				case E_PAGETYPE_Organisation:
					await LoadOrgs();
					break;
				case E_PAGETYPE_User:
				case E_PAGETYPE_Project:
				case E_PAGETYPE_Machine:
				case E_PAGETYPE_Default:
				case E_PAGETYPE_OrganisationEdit:
				case E_PAGETYPE_OrganisationEditMachines:
				case E_PAGETYPE_OrganisationEditProjects:
				case E_PAGETYPE_OrganisationEditUsers:
				case E_PAGETYPE_OrganisationCreate:
				default:
					break;
			}
			PageType = NewPageState;
			bShouldDisplay = true;
		}
		catch (Exception)
		{
			PageType = E_PAGETYPE_Default;
		}
		finally
		{
			showModal = false;
		}
	}





	async function SwitchToUserAdmin()
	{
		SwitchPageActual(E_PAGETYPE_User);
	}

	

	async function SwitchToFrontPage()
	{
		try
		{
			PageType = E_PAGETYPE_Default;
		}
		catch (Exception)
		{
			//PageState = EState_FrontPage;
		}
		finally
		{
			showModal = false;
		}
		
	}

	async function SwitchToPreviousPage()
	{
		try
		{
			switch(PageType)
			{
				case E_PAGETYPE_User:
				case E_PAGETYPE_Organisation:
				case E_PAGETYPE_Project:
					PageType = E_PAGETYPE_Default;
					break;
				case E_PAGETYPE_OrganisationEdit:
					PageType = E_PAGETYPE_Organisation;
					break;
				case E_PAGETYPE_OrganisationEditMachines:
				case E_PAGETYPE_OrganisationEditProjects:
				case E_PAGETYPE_OrganisationEditUsers:
					PageType = E_PAGETYPE_OrganisationEdit;
					break;
			}
		}
		catch (Exception)
		{
			//PageState = EState_FrontPage;
		}
		finally
		{
			showModal = false;
		}
		
	}










	let showModal = false;
	let listedTags: string[] = [];
	let globalAllTags: string[] = [];

	let newBoardName: string = "";
	let editTagString: string = "";
	let listedModalX: number = 0;
	let listedModalY: number = 0;
	let listedHash: string = "";
	let listedShortHash: string = "";
	let selectedTagControl: string = undefined;
	let selectedTagCount: number = 0;
	let selectedNewTagName: string = undefined;
	let confirmationAction: Function = undefined;
	//let oldPageState: number = undefined;



	let photos = [];
	let SelectedBoardName = "";
	let SelectedBoardID = 0; // Invalid. ID starts at 1
	let TagSearchString: string = "Query";


	// Compute the width of the screen and adjust column count
	let columnarCount: number = 0;
	let columnImages = [];



	// // Also, fetch temporary images
	// onMount(async () => {
	// 	try 
	// 	{
	// 		await LoadBoards();
	// 	}
		
	// });

	//beforeUpdate(updateColumns);
	//onMount(updateColumns);

	//onMount(fetchStats);
	onMount(GetUserInfo);
	//onMount(UpdateTagList);
	//onMount(LoadBoards);


</script>

<!--<svelte:window on:hashchange={GetUserInfo} on:resize={boundUpdateColumns} on:scroll={HandleScroll}/>-->
<svelte:window on:hashchange={GetUserInfo}/>

<nav>
	<div class="title" >
		<h1 on:click={SwitchToPreviousPage}>
			{#if isLoggedIn}
				{#if PageType == E_PAGETYPE_Default}
					DEFAULT
				{:else if PageType == E_PAGETYPE_User}
					USER
				{:else if PageType == E_PAGETYPE_Organisation}
					ORG
				{:else if PageType == E_PAGETYPE_OrganisationEdit}
					{orgName}
				{:else if PageType == E_PAGETYPE_OrganisationEditMachines}
					{hasOrgUUID ? orgName+"/" : ""}Machines
				{:else if PageType == E_PAGETYPE_OrganisationEditUsers}
					{hasOrgUUID ? orgName+"/" : ""}Users
				{:else if PageType == E_PAGETYPE_OrganisationEditProjects}
					{hasOrgUUID ? orgName+"/" : ""}Projects
				{:else if PageType == E_PAGETYPE_Project}
					PROJECT
				{/if}
			{:else}
				ShaderBuilder
			{/if}
			
		</h1>
		<span on:click={SwitchToUserAdmin} class="hovername" style="margin-left:10px;"><em>{displayname}</em></span>
	</div>
	<div class="box">
		{#if isLoggedIn}
			<span class="areffix fakea" on:click={SwitchToFrontPage}>Menu</span>
		{/if}
		<a class="areffix" href="/{isLoggedIn ? "logout":"login"}"> {isLoggedIn ? "Sign Out":"Sign In"} </a>
	</div>
</nav>

<main style="padding-top: 64px;">
	<!-- <p>Welcome to the Mirage Moodboard</p>
	<br/>
	{#if countImages > 0}
		<p>Mirage contains {countImages} {countImages === 1 ? 'image' : 'images'}</p>
		<br/>
	{/if} -->
	{#if isLoggedIn}
		{#if PageType == E_PAGETYPE_Default}
			<div class="menu">
				<Card editState={E_PAGETYPE_User} on:summon={SwitchPage} name="Account"/>
				<Card editState={E_PAGETYPE_Organisation} on:summon={SwitchPage} name="Organisations"/>
				<Card editState={E_PAGETYPE_Project} on:summon={SwitchPage} name="Projects"/>
			</div>
		{:else if PageType == E_PAGETYPE_User}
			<div class="">
				USER PAGE
			</div>
		{:else if PageType == E_PAGETYPE_Organisation}
			<div class="">
				<div class="menu">
					{#if (bShouldDisplay && nOrgs > 0)}
						{#each userOrgs as org}
							<Card type="Organisation" editState={E_PAGETYPE_OrganisationEdit} uuid={org.uuid} name={org.displayname} on:summon={SwitchToOrgEdit}/>
						{/each}
					{/if}
					<Card type="New" editState={E_MODALSTATE_CreateOrg} uuid=0 name="Create Organisation" on:summon={SpawnCreateModal}/>
				</div>				
			</div>
		{:else if PageType == E_PAGETYPE_OrganisationEdit}
			<div class="menu">
				<Card type={orgName} uuid={orgUUID} on:summon={SwitchToOrgMachines} name="Machines"/>
				<Card type={orgName} uuid={orgUUID} on:summon={SwitchToOrgUsers} name="Users"/>
				<Card type={orgName} uuid={orgUUID} on:summon={SwitchToOrgProjects} name="Projects"/>
			</div>
		{:else if PageType == E_PAGETYPE_OrganisationEditMachines}
			<div class="">
				<div class="menu">
					{#if (nOrgMachines > 0)}
						{#each orgMachines as mac}
							<Card type="Machine" editState={E_MODALSTATE_ShowMachine} uuid={mac.fingerprint} name={mac.machinename} on:summon={SpawnCreateModal}/>
						{/each}
					{/if}
					<Card type="New" editState={E_MODALSTATE_CreateMachine} uuid=0 name="Add Machine" on:summon={SpawnCreateModal}/>
				</div>				
			</div>
		{:else if PageType == E_PAGETYPE_OrganisationEditProjects}
			<div class="">
				<div class="menu">
					{#if (nOrgProjects > 0)}
						{#each orgProjects as proj}
							<Card type="Project" editState={E_MODALSTATE_ShowProject} uuid={proj.uuid} name={proj.displayname} on:summon={SpawnCreateModal}/>
						{/each}
					{/if}
					<Card type="New" editState={E_MODALSTATE_CreateProject} uuid=0 name="Add Project" on:summon={SpawnCreateModal}/>
				</div>				
			</div>
		{:else if PageType == E_PAGETYPE_Project}
			<div class="">
				<div class="menu">
					{#if (nUserProjects > 0)}
						{#each userProjects as proj}
							<Card type="Project" editState={E_MODALSTATE_ShowProject} uuid={proj.uuid} name={proj.displayname} on:summon={SpawnCreateModal}/>
						{/each}
					{:else}
						<h3>You have been assigned to zero projects</h3>
					{/if}
				</div>				
			</div>
		{/if}
	{/if}
</main>

{#if showModal}
	{#if ModalState == E_MODALSTATE_CreateOrg}
	<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
		<h2 slot="header">
			Create Organisation
		</h2>
		<!-- <input bind:value={SelectedBoardID} type="number" min="1"> -->
		<!-- <span class="centering">
		<button on:click={HandleAddToBoard}>Add to Board</button>
		<button on:click={HandleRemoveFromBoard}>Remove</button>
		</span>
		<textarea bind:value={editTagString} rows="15"></textarea>
		<button on:click={HandleSubmitNewTags}>Save Tags</button>
		<button on:click={HandleSuggestTags}>Suggest</button>
		<button on:click={HandleViewOriginal}>View</button> -->

		
	</Modal>
	{:else if ModalState == E_MODALSTATE_ShowMachine}
		<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
			<h2 slot="header">
				{selectedEntityName}
			<em class="smallheader">(Machine)</em></h2>
			<span class="centering">{selectedMachineFingerprint}</span>
			<button style="float:right" on:click={DeleteOrgMachine}>Remove</button>
		</Modal>
	{:else if ModalState == E_MODALSTATE_ShowProject}
		<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
			<h2 slot="header">
				{selectedEntityName}
			<em class="smallheader">(Project)</em></h2>
			<span class="centering">{selectedProjectUUID}</span>
			<!-- <button style="float:right" on:click={DeleteOrgMachine}>Remove</button> -->
		</Modal>
	{:else if ModalState == E_MODALSTATE_CreateProject}
		<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
			<h2 slot="header">
				Create Project
			</h2>
			<span class="centeringnospace">
				<input bind:value={entryName} placeholder="New Project Name">
				<button on:click={CreateHandler}>Create</button>
			</span>

		</Modal>
	{:else if ModalState == E_MODALSTATE_CreateMachine}
		<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
			<h2 slot="header">
				Create Machine
			</h2>
			<span class="centeringnospace">
				<input bind:value={entryName} placeholder="New Machine Name">
				<button on:click={CreateHandler}>Create</button>
			</span>

		</Modal>
	{/if}
{/if}

<style>
	.menu {
		justify-content: center;
		display:grid;
		row-gap: 10px;
		column-gap: 10px;
		grid-template-columns: repeat(auto-fit, min(100%, 375px));
	}

	h1
	{
		font-size: 1.35em;
		color: #ff3e00;
		font-weight: 100;
		font-family: 'Roboto','Bebas Neue', 'Flow Circular',  sans-serif;
		font-display: swap;
		
		margin-left: 25px;
	}

	nav 
	{
		position: fixed;
		width: 100%;
		height: 54px;
		/* line-height: 54px; */
		filter: drop-shadow(0 5px 5px black);
		background-color: #1c1c1c;
	}

	nav div.box
	{
		float:right;
	}

	.fakea
	{
		cursor: pointer;
	}

	.fakea, nav a
	{
		/* line-height: 54px; */
		margin-right:25px;
		color: #ff3e00;
	}

	nav div.title
	{
		float:left;
		display: flex;
		flex-direction: row;
		margin-top: 14px;
	}

	nav div span{
		/* line-height: 58px; */
		margin-top: 5px;
	}


	.hovername
	{
		border-width: 0;
		border-bottom: #ff3e00;
		border-style: groove;
		border-bottom-width: 0;
		transition: border-bottom-width 0.15s ease-in-out;
		
	}

	.hovername:hover
	{
		border-bottom-width: 4px;
	}

	.areffix
	{
		line-height: 54px;
	}

	@media (max-width: 1640px) {
		.areffix {
			line-height: 60px;
		}
	}

	.photos {
		width: 100%;
		display: grid;
		grid-gap: 0px;
		grid-row-gap: 0px;
	}

	.flexi {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	img {
		width: 100%;
		margin: 0;
		border: none;
	}

	.centering {
		display: flex;
		justify-content: space-evenly;
		flex-wrap: nowrap;
		align-content: flex-end;
	}

	.centeringnospace {
		display: flex;
		justify-content: center;
		flex-wrap: nowrap;
		align-content: flex-end;
	}

	.smallheader {
		font-size: 0.75em;
		color: #ff3e00;
		font-weight: 100;
	}

    textarea
    {
        background-color: #3c3c3c;
        color: white;
		width:100%;
    }

	select
	{
		background-color: #3c3c3c;
        color: white;
		width:50%;
	}

	button
	{
		background-color: #2c2c2c;
        color: white;
	}


	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>