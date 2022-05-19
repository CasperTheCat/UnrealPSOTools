<script lang="ts">
	// import { waitForDebugger } from 'inspector';
	// import { tick } from 'svelte';
	import { onMount } from 'svelte';
	// import { beforeUpdate, afterUpdate } from 'svelte';
	import Modal from './Modal.svelte';
	import Card from "./Card.svelte";
	import Image from "./Image.svelte";

	export let name: string = "";
	let displayname: string;
	let isLoggedIn: boolean = false;
	let AliveCheck;

	let E_PAGETYPE_Organisation: number = 0;
	let E_PAGETYPE_User: number = 1;
	let E_PAGETYPE_Project: number = 2;
	let E_PAGETYPE_Machine: number = 3;
	let E_PAGETYPE_Default: number = 4;
	let PageType: number = E_PAGETYPE_Default;


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








	async function SwitchToUserAdmin()
	{
		try
		{
			// Load Boards
			//await LoadBoards();
			PageType = E_PAGETYPE_User;
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










	let showModal = false;
	let listedTags: string[] = [];
	let globalAllTags: string[] = [];
	let userBoards = [];
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
	let bShouldDisplay: boolean = false;

	// Compute the width of the screen and adjust column count
	let columnarCount: number = 0;
	let columnImages = [];

	async function SwitchToFrontPage()
	{
		try
		{
			//PageState = EState_FrontPage;
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
	<div class="title" on:click={SwitchToFrontPage}>
		<h1>

			{#if isLoggedIn}
				{#if PageType == E_PAGETYPE_Default}
					DEFAULT
				{:else if PageType == E_PAGETYPE_User}
					USER
				{/if}
			{:else}
				ShaderBuilder
			{/if}
			
		</h1>
		<span style="margin-left:10px;"><em>{displayname}</em></span>
	</div>
	<div class="box">
		<a class="areffix" href="/{isLoggedIn ? "B":"login"}"> {isLoggedIn ? "Sign Out":"Sign In"} </a>
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
		<div class="menu">
			<Card on:summon={SwitchToUserAdmin} name="Account"/>
			<Card name="Organisations"/>
			<Card name="Projects"/>
		</div>
	{/if}
</main>

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
		line-height: 54px;
		filter: drop-shadow(0 5px 5px black);
		background-color: #1c1c1c;
	}

	nav div.box
	{
		float:right;
	}

	nav a
	{
		line-height: 54px;
		margin-right:25px;
	}

	nav div.title
	{
		float:left;
		display: flex;
		flex-direction: row;
	}

	nav div span{
		line-height: 58px;
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