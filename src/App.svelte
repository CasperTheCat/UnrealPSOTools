<script lang="ts">
	// import { waitForDebugger } from 'inspector';
	// import { tick } from 'svelte';
	import { onMount } from 'svelte';
	// import { beforeUpdate, afterUpdate } from 'svelte';
	import Modal from './Modal.svelte';
	import Card from "./Card.svelte";
	import Image from "./Image.svelte";

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

	export let name: string;
	let loggedIn: boolean = false;

	let countImages: number;
	countImages = 0;

	let photos = [];
	let loadedPhotoCount = 0;
	let SelectedBoardName = "";
	let SelectedBoardID = 0; // Invalid. ID starts at 1
	let TagSearchString: string = "Query";
	let bShouldDisplay: boolean = false;

	// Compute the width of the screen and adjust column count
	let columnarCount: number = 0;
	let columnImages = [];

	// Declare state enum
	const EState_FrontPage = 0;
	const EState_BoardSelect = 1;
	const EState_BoardView = 2;
	const EState_SearchView = 3;
	const EState_TagUntagView = 4;
	const EState_TagManView = 5;

	const EStateModal_Normal = 0;
	const EStateModal_Confirm = 1;

	let PageState = EState_FrontPage;
	let ModalState = EStateModal_Normal;

	let KeyStateLive:boolean = false;

	async function HandleViewOriginal()
	{
		try
		{
			let location = "/api/image/data/" + listedHash;
			window.open(location);
		}
		catch (Exception)
		{

		}
	}

	async function HandleRemoveFromBoard()
	{
		try
		{
			let fetchable = await fetch(`/api/board/remove`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
  				body: JSON.stringify(
					[
						{
						  "board": SelectedBoardID,
						  "hashes": [listedHash]
						}
					]  
				  )
			});
		}
		catch (Exception)
		{
			console.log(Exception);	
		}
		finally
		{
			if(PageState === EState_BoardView)
			{
				bShouldDisplay = false;
				await SwitchToBoardView(SelectedBoardID);
			}
			showModal = false;
		}
	}

	async function HandleAddToBoard()
	{
		try
		{
			let fetchable = await fetch(`/api/board/add`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
  				body: JSON.stringify(
					[
						{
						  "board": SelectedBoardID,
						  "hashes": [listedHash]
						}
					]  
				  )
			});
			
			
		}
		catch (Exception)
		{

		}
		finally
		{
			if(PageState === EState_BoardView)
			{
				bShouldDisplay = false;
				await SwitchToBoardView(SelectedBoardID);
			}
			showModal = false;
		}
	}

	async function UpdateTagList()
	{
		try
		{
			//console.log(event.detail.hash);
			let fetchable = await fetch('/api/image/tags');
			let blob: JSON = await fetchable.json();

			if ("tags" in blob)
			{
				globalAllTags = blob["tags"];
				console.log(globalAllTags);
			}
		}
		catch (Exception)
		{
			if(loggedIn)
			{
				console.log("Getting tags failed");
			}
		}
	}

	async function HandleNewBoard()
	{
		// 
		console.log("Creating", newBoardName);

		// console
		try
		{
			let fetchable = await fetch(`/api/board/create`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
  				body: JSON.stringify([newBoardName])
			});
		}
		catch (Exception)
		{

		}
		finally
		{
			await LoadBoards();
		}
	}

	async function HandleViewTag()
	{
		// Okay, we want to switch page state
		try 
		{
			await SwitchToSearchView();
			TagSearchString = selectedTagControl !== undefined ? `'${selectedTagControl}'` : "";
			await ExecuteSearch();
		}
		catch (Exception)
		{

		}
	}

	async function HandleSuggestTags()
	{
		try
		{
			let fetchable = await fetch(`/api/image/meta/${listedHash}/suggested`);
			let blob: JSON = await fetchable.json();

			if ("suggested" in blob)
			{
				editTagString = blob["suggested"].join("\n");
			}
			else
			{
				console.log("?");
			}
		}
		catch (Exception)
		{

		}
	}

	async function HandleSubmitNewTags()
	{
		try
		{
			if (listedHash === "")
			{
				return;
			}

			let tgs = editTagString.split("\n");

			// for (let i = 0; i < tgs.length; ++i)
			// {
			// 	tgs[i] = `'${tgs[i]}'`
			// }

			// Remove nulls. Backend should do this too, but why not make it easier
			tgs = tgs.filter(e=>e);

			let fetchable = await fetch(`/api/image/meta/${listedHash}/tag`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json;charset=utf-8'
				},
  				body: JSON.stringify(tgs)
			});
			
			showModal = false;
			UpdateTagList();
		}
		catch (Exception)
		{

		}
	}

	async function HandleConfirmedAction()
	{
		try
		{
			if(confirmationAction !== undefined)
			{
				await confirmationAction();
				confirmationAction = undefined;
			}

			// We want to go back
			//PageState = oldPageState;
			ModalState = EStateModal_Normal;

			// Make sure
			showModal = false;
		}
		catch (Exception)
		{

		}
	}

	async function HandleCancelledAction()
	{
		// Just delete the action that got stored
		// We don't want to accidentally trigger it
		if(confirmationAction !== undefined)
		{
			confirmationAction = undefined;
		}

		//PageState = oldPageState;
		ModalState = EStateModal_Normal;
	}

	async function ShowConfirmModal()
	{
		ModalState = EStateModal_Confirm;
	}

	async function HandleWantDeleteTag()
	{
		// Store function
		confirmationAction = HandleDeleteTag;
		//oldPageState = PageState;
		//PageState = EState_Confirm;
		ShowConfirmModal();
	}

	async function HandleDeleteTag()
	{
		try
		{
			if (selectedTagControl !== undefined)
			{
				let fetchable = await fetch('/api/image/tag/delete',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=utf-8'
					},
					body: JSON.stringify([selectedTagControl])
				});
				
				showModal = false;
			}
		}
		catch (Exception)
		{

		}
		finally
		{
			await UpdateTagList();
		}
	}

	async function HandleWantRenameTag()
	{
		// Store function
		confirmationAction = HandleRenameTag;
		//oldPageState = PageState;
		//PageState = EState_Confirm;
		ShowConfirmModal();
	}

	async function HandleWantAppendTag()
	{
		// Store function
		confirmationAction = HandleAppendTag;
		//oldPageState = PageState;
		//PageState = EState_Confirm;
		ShowConfirmModal();
	}

	async function HandleWantApplyToQuery()
	{
		// Store function
		confirmationAction = HandleApplyToQuery;
		//oldPageState = PageState;
		//PageState = EState_Confirm;
		ShowConfirmModal();
	}

	async function GetTagCount(tagList: string[])
	{
		try
		{
			let fetchable = await fetch('/api/image/tag/count',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=utf-8'
					},
					body: JSON.stringify(tagList)
				});

			// fetchable is an array
			let blob: number[] = await fetchable.json();
			if (blob.length === tagList.length)
			{
				return blob;
			}
			else
			{
				console.log("GetTagCount?");
				return [];
			}
		}
		catch (Exception)
		{
			throw Exception;
		}
	}

	async function HandleRenameTag()
	{
		try
		{
			if (selectedTagControl !== undefined && selectedNewTagName !== undefined && selectedNewTagName !== "")
			{
				let fetchable = await fetch('/api/image/tag/rename',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=utf-8'
					},
					body: JSON.stringify(
						{
							"tagPairs": [
								[selectedTagControl, selectedNewTagName]
							]
						})
				});
				
				showModal = false;
			}
		}
		catch (Exception)
		{

		}
		finally
		{
			await UpdateTagList();
		}
	}

	async function HandleAppendTag()
	{
		try
		{
			// Treat as
			if (selectedTagControl !== undefined && selectedNewTagName !== undefined && selectedNewTagName !== "")
			{
				// Okay. We are applying the box to the tag. Box is selected New Tag Name
				// Can separate by newline
				let tgs = selectedNewTagName.split("\n");
				tgs = tgs.filter(e=>e);
				let tagPairList = [];

				for (let tg of tgs)
				{
					tagPairList.push([selectedTagControl, tg]);
				}

				console.log(tagPairList);

				let fetchable = await fetch('/api/image/tag/append',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=utf-8'
					},
					body: JSON.stringify(
						{
							"tagPairs": tagPairList
						})
				});
				
				showModal = false;
			}
		}
		catch (Exception)
		{

		}
		finally
		{
			await UpdateTagList();
		}
	}

	async function HandleApplyToQuery()
	{
		try
		{
			// Treat as
			if (selectedTagControl !== undefined && selectedNewTagName !== undefined && selectedNewTagName !== "")
			{
				let fetchable = await fetch('/api/image/tag/applyquery',
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json;charset=utf-8'
					},
					body: JSON.stringify(
						{
							"tagPairs": [
								[selectedNewTagName, selectedTagControl]
							]
						})
				});
				
				showModal = false;
			}
		}
		catch (Exception)
		{

		}
		finally
		{
			await UpdateTagList();
		}
	}

	function ForcedScrollToModal()
	{
		scrollTo(0, listedModalY );// listedModalY);
	}

	async function HandleScroll(event)
	{
		if(showModal)
		{
			ForcedScrollToModal();
		}
	}

	async function HandleSelectBoard(event)
	{
		try
		{
			// Okay...
			console.log(event.detail);
			//SelectedBoardName
			// Get Images
			const tag = event.detail.tag;
			if ("boardid" in tag && "boardname" in tag)
			{
				SelectedBoardName = tag.boardname;
				await SwitchToBoardView(tag.boardid);
			}
			
			//await LoadImages(`/api/board/${event.detail.tag}/images`);
		}
		catch (Exception)
		{

		}
	}

	async function HandleTagControlSummon(event)
	{
		try
		{
			if (globalAllTags.length === 0)
			{
				await UpdateTagList();
			}
			//console.log(event.detail.hash);
			//let fetchable = await fetch(`/api/image/meta/${event.detail.hash}/tag`);
			//let blob: JSON = await fetchable.json();

			// if ("tags" in blob)
			// {
			// 	listedTags = blob["tags"];
			// 	console.log(listedTags);
			// }			

			listedModalX = event.detail.x;// - (innerHeight / 2) ;
			listedModalY = event.detail.y;// - (innerHeight / 2);

			selectedTagControl = event.detail.tag;
			let tagCounts = await GetTagCount([event.detail.tag]);
			if(tagCounts.length > 0)
			{
				selectedTagCount = tagCounts[0];
				console.log(selectedTagCount);
			}

			if (selectedTagControl !== undefined)
			{
				ModalState = EStateModal_Normal;
				showModal = true;
				selectedNewTagName = selectedTagControl;
				ForcedScrollToModal();
			}
		}
		catch (Exception)
		{
			console.log("Failed to summon tag panel");
			showModal = false;
			console.log(Exception);
		}
	}

	async function HandleImageDesummon(event) 
	{
		listedTags = [];
		listedHash = "";
		listedShortHash = "";
		listedModalX = 0;
		listedModalY = 0;
		showModal = false;
	}

	async function HandleImageSummon(event) 
	{
		try
		{
			//console.log(event.detail.hash);
			let fetchable = await fetch(`/api/image/meta/${event.detail.hash}/tag`);
			let blob: JSON = await fetchable.json();

			if ("tags" in blob)
			{
				listedTags = blob["tags"];
				console.log(listedTags);
			}			

			listedModalX = event.detail.x;// - (innerHeight / 2) ;
			listedModalY = event.detail.y;// - (innerHeight / 2);

			editTagString = listedTags.join("\n");
			listedHash = event.detail.hash;
			listedShortHash = listedHash.slice(0, 8);

			ModalState = EStateModal_Normal;
			showModal = true;
			ForcedScrollToModal();
		}
		catch (Exception)
		{
			console.log("Failed to summon image panel");
			showModal = false;
			console.log(Exception);
		}
	}

	async function HandleSearchInput(event)
	{
		if(KeyStateLive)
		{
			await ExecuteSearch();
		}
//		await tick();
	}

	async function HandleSearchKey(event)
	{
		// Handle Tab Key
		if (event.key === 'Tab')
		{
			event.preventDefault();
			KeyStateLive = !KeyStateLive;
		}

		if (event.key !== 'Enter') return;

		await ExecuteSearch();
	}

	async function ResetDisplayState()
	{
		TagSearchString = "";
		bShouldDisplay = false;
	}

	async function ResetSearchState()
	{
		TagSearchString = "";
	}

	async function SwitchToFrontPage()
	{
		try
		{
			// Reset Image Count
			loadedPhotoCount = 0;
			PageState = EState_FrontPage;
		}
		catch (Exception)
		{
			PageState = EState_FrontPage;
		}
		finally
		{
			ResetDisplayState();
			showModal = false;
		}
		
	}

	async function SwitchToBoardSelect()
	{
		try
		{
			// Load Boards
			await LoadBoards();
			PageState = EState_BoardSelect;
		}
		catch (Exception)
		{
			PageState = EState_FrontPage;
		}
		finally
		{
			ResetSearchState();
			showModal = false;
		}
	}

	async function ExecuteSearch() 
	{
		if (TagSearchString === "")
		{
			bShouldDisplay = false;
			loadedPhotoCount = 0;
			return;
		}

		try
		{
			if (PageState === EState_SearchView)
			{
				await LoadImages(`/api/search/bytag/${TagSearchString}`);
			}
			else
			{
				console.log("State is bad?");
				return;
			}
		}
		catch (Exception)
		{
			//throw Exception;
			console.log("Bad Search");
		}
		finally
		{
			bShouldDisplay = true;
		}
	}

	async function SwitchToSearchView()
	{
		try
		{
			// Don't load. We wait for search
			//await LoadImages('/api/search/image');
			PageState = EState_SearchView;
		}
		catch (Exception)
		{
			//console.log(Exception);
			PageState = EState_FrontPage;
		}
		finally
		{
			ResetSearchState();
			showModal = false;
		}
		
	}	

	async function SwitchToBoardView(id: number)
	{
		try
		{
			await LoadImages(`/api/board/${id}/images`);
			SelectedBoardID = id;
			PageState = EState_BoardView;
			bShouldDisplay = true;
		}
		catch (Exception)
		{
			PageState = EState_FrontPage;
		}
		finally
		{
			ResetSearchState();
			showModal = false;
		}
		
	}

	async function SwitchToTaggerSelect()
	{
		try
		{
			await LoadImages("/api/search/image")
			bShouldDisplay = true;
			console.log(photos);
			PageState = EState_TagUntagView;
		}
		catch (Exception)
		{
			PageState = EState_FrontPage;
		}
		finally
		{
			//ResetState();
			ResetSearchState();
			showModal = false;
		}
		
	}

	async function SwitchToBoardManSelect()
	{
		
	}

	async function SwitchToTagManSelect()
	{
		try
		{
			// Wait for the update
			await UpdateTagList();
			//bShouldDisplay = true;
			PageState = EState_TagManView;
		}
		catch (Exception)
		{
			PageState = EState_FrontPage;
		}
		finally
		{
			//ResetState();
			ResetSearchState();
			showModal = false;
		}
		
	}


	async function fetchStats()
	{
		try
		{
			let fetched = await fetch(`/stats`);
			let statistics: JSON = await fetched.json();

			if ("count" in statistics)
			{
				countImages = parseInt(statistics["count"], 10);
			}
		}
		catch (Exception)
		{
			if (loggedIn)
			{
				// Okay... Something has *actually* gone wrong
				console.log("Fetching Mirage Stats failed");
			}
		}
	}

	async function GetUserInfo()
	{
		try
		{
			let fetched = await fetch(`/api/user`);
			let userinfo: JSON = await fetched.json();

			name = userinfo['displayname'];
			loggedIn = true;
		}
		catch (Exception)
		{
			if (loggedIn)
			{
				// Okay... Something has *actually* gone wrong
				console.log("Fetching Mirage user has failed, but state says session is live");
			}
		}
		finally
		{
			
		}
	}

	function argmin(a) {
		let lowest = 0;
		for (let i = 1; i < a.length; i++) {
			if (a[i] < a[lowest]) lowest = i;
		}
		return lowest;
	}

	async function updateColumns(updateIsQuery: boolean = false)
	{
		// We want to enforce a minimum of 250px and a max of 500 for this view.
		let proxy = Math.max(1, (innerWidth / 375));// + 1;
		//console.log(proxy)

		let newColumnCount = Math.floor(proxy);
		if (newColumnCount !== columnarCount || updateIsQuery)
		{
			// Update the lists
			columnImages = [];
			let heights = [];
			for (let i = 0; i < newColumnCount; ++i)
			{
				columnImages.push([]);
				heights.push(i * 0.001)
			}		

			for (let i = 0; i < photos.length; ++i)
			{
				//i % newColumnCount
				let operatingIndex = argmin(heights);
				//console.log("W", operatingIndex);
				//console.log(heights);
				columnImages[operatingIndex].push(photos[i]);
				const photo = photos[i];
				heights[operatingIndex] += photo["height"] / photo["width"];	
			}

			columnarCount = newColumnCount;
		}
	}

	async function boundUpdateColumns()
	{
		await updateColumns();
	}

	async function LoadBoards(override: boolean = false)
	{
		// Go ahead and check we're even in the correct state
		// if (!(PageState === EState_BoardView || override))
		// {
		// 	return;
		// }

		try
		{
			let fetchable = await fetch('/api/board')
			let blob: JSON = await fetchable.json();
			
			//console.log(blob);
			if("boards" in blob)
			{
				userBoards = blob["boards"];
			}
			console.log(userBoards);
		}
		catch (Exception)
		{
			throw Exception;
		}
		finally
		{

		}
	}

	async function LoadImages(path:string, override: boolean = false)
	{
		// Go ahead and check we're even in the correct state
		// if (
		// 	!(
		// 		PageState === EState_SearchView ||
		// 		PageState === EState_BoardView ||
		// 		override
		// 	)
		// )
		// {
		// 	return;
		// }

		try
		{
			let fetchable = await fetch(path);
			let blob: JSON = await fetchable.json();

			if ("images" in blob)
			{
				photos = blob["images"];
				loadedPhotoCount = photos.length;
				console.log(photos);
			}

			// New Mode
			// Firstly, we want to segment photos into subarrays
			let newPhotos = []

			let npIndex = 0;
			while (npIndex < photos.length)
			{
				// Subsegment
				let tempArray = [];
				
				// Fill
				let upperRange = Math.min(13, photos.length - npIndex);
				for (let i = 0; i < upperRange; ++i)
				{
					tempArray.push(photos[npIndex + i]);
				}

				// Sort
				tempArray.sort((a,b) => {
					let r1 = a["height"] / a["width"];
					let r2 = b["height"] / b["width"];
					return r2 - r1;
				});

				// Append
				for (let item of tempArray)
                {
					newPhotos.push(item);
				}
				//newPhotos.push(tempArray);

				// Update npIndex
				npIndex += upperRange;
			}

			photos = newPhotos;


			// Below is optimal
			//photos.sort((a,b) => {
			//	let r1 = a["height"] / a["width"];
			//	let r2 = b["height"] / b["width"];
			//	return r2 - r1;
			//});

			// if (photos.length > 20)
			// {
			// 	photos = photos.slice(0, 20);
			// }

			// Update
			await updateColumns(true);
		}
		catch (Exception)
		{
			throw Exception;
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

	onMount(fetchStats);
	onMount(GetUserInfo);
	onMount(UpdateTagList);
	onMount(LoadBoards);

</script>

<svelte:window on:hashchange={GetUserInfo} on:resize={boundUpdateColumns} on:scroll={HandleScroll}/>

<nav>
	<div class="title" on:click={SwitchToFrontPage}>
		<h1>
			Mirage{name !== "" ? "/" : ""}{name}{#if PageState === EState_BoardSelect}
			/Boards
			{:else if PageState === EState_BoardView}
			/{SelectedBoardName}
			{:else if PageState === EState_SearchView}
			/Search
			{:else if PageState === EState_TagUntagView}
			/Untagged
			{:else if PageState === EState_TagManView}
			/TagMan
			{/if}
			
		</h1>
		<span style="margin-left:10px;"><em>{loadedPhotoCount}/{countImages}</em></span>
	</div>
	<div class="box">
		<a href="/{loggedIn ? "logout":"login"}"> {loggedIn ? "Sign Out":"Sign In"} </a>
	</div>
</nav>

<main style={PageState === EState_BoardSelect || PageState === EState_TagManView || PageState === EState_FrontPage ? "padding-top: 64px;" : "padding-top: 54px;"}>
	<!-- <p>Welcome to the Mirage Moodboard</p>
	<br/>
	{#if countImages > 0}
		<p>Mirage contains {countImages} {countImages === 1 ? 'image' : 'images'}</p>
		<br/>
	{/if} -->
	{#if loggedIn}
		{#if PageState === EState_SearchView}
			<div>
				<br>
				<h2>Tag Search</h2>
				<input bind:value={TagSearchString} placeholder="Query" on:input={HandleSearchInput} on:keydown={HandleSearchKey}>
				<input type="submit" value="Execute" on:click={ExecuteSearch}/>
				<!-- <input  value="Submit"> -->
				<br>
				<br>
			</div>
		{:else if PageState === EState_BoardSelect}
			<div>
				<br>
				<h2>Board Select</h2>
				<br>
				<h3>Create New Board</h3>
				<input bind:value={newBoardName} placeholder="New Board Name">
				<input type="submit" value="Create" on:click={HandleNewBoard}/>
				<!-- <input  value="Submit"> -->
				<br>
				<br>
			</div>
		{/if}

		{#if (
			PageState === EState_SearchView || 
			PageState === EState_BoardView || 
			PageState === EState_TagUntagView 
			)}
			<!-- && loadedPhotoCount > 0} -->
			{#if (bShouldDisplay && loadedPhotoCount > 0)}
				<div class="photos" style="grid-template-columns: repeat({columnarCount}, 1fr);">
					{#each columnImages as col}
						<div class="flexi">
							{#each col as photo}
								<!-- <img src="/api/image/data/{photo.hash}" alt="" on:click={HandleImageSummon}> -->
								<Image hash="{photo.hash}" on:summon={HandleImageSummon}/>
							{/each}
						</div>
					{/each}
				</div>
			{:else if bShouldDisplay}
				<p>Nothing to display!</p>
			{/if}
		{:else if PageState === EState_BoardSelect}
			<div class="menu">
				{#each userBoards as col}
					<Card name="{col.boardname}" tag={col} on:summon={HandleSelectBoard}/>
				{/each}
			</div>
		{:else if PageState === EState_TagManView}
			<div class="menu">
				{#each globalAllTags as col}
					<Card name="{col}" tag={col} on:summon={HandleTagControlSummon}/>
				{/each}
			</div>
		{:else}
			<div class="menu">
				<Card on:summon={SwitchToBoardSelect} name="Boards"/>
				<Card on:summon={SwitchToSearchView} name="Search"/>
				<Card on:summon={SwitchToTaggerSelect} name="Untagged"/>
				<Card on:summon={SwitchToTagManSelect} name="Tag Management"/>
				<Card on:summon={SwitchToBoardManSelect} name="Board Management"/>
			</div>
		{/if}
	{/if}
</main>

{#if showModal}
	{#if PageState === EState_TagManView && ModalState === EStateModal_Confirm}
		<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
			<h2 slot="header">
				Confirm?
			</h2>
			<button on:click={HandleCancelledAction}>Cancel</button>
			<button on:click={HandleConfirmedAction}>Proceed</button>
		</Modal>
	{:else if PageState === EState_TagManView}
		<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
			<h2 slot="header">
				Selected Tag: {selectedTagControl}
			</h2>
			<p>Applied to {selectedTagCount} { selectedTagCount == 1 ? "entry" : "entries"}</p>
			<textarea bind:value={selectedNewTagName} rows="1"></textarea>
			<button on:click={HandleViewTag}>View Tag</button>
			<button on:click={HandleWantAppendTag}>Apply to Tag</button>
			<button on:click={HandleWantApplyToQuery}>Apply Tag to Query</button>
			<br>
			<button on:click={HandleWantDeleteTag}>Delete Tag</button>
			<button on:click={HandleWantRenameTag}>Rename Tag</button>
		</Modal>
	{:else}
		<Modal offsetY={listedModalY} on:close={HandleImageDesummon}>
			<h2 slot="header">
				Tagging {listedShortHash}
			</h2>
			<!-- <input bind:value={SelectedBoardID} type="number" min="1"> -->
			<span class="centering">
			<select bind:value={SelectedBoardID}>
				{#each userBoards as brds}
					<option value={brds.boardid}>{brds.boardname}</option>
				{/each}
			</select>
			<button on:click={HandleAddToBoard}>Add to Board</button>
			<button on:click={HandleRemoveFromBoard}>Remove</button>
			</span>
			<textarea bind:value={editTagString} rows="15"></textarea>
			<button on:click={HandleSubmitNewTags}>Save Tags</button>
			<button on:click={HandleSuggestTags}>Suggest</button>
			<button on:click={HandleViewOriginal}>View</button>

			
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
		line-height: 56px;
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